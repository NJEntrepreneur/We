# CLAUDE.md — Developer Platform (Modular Architecture)

> This file is the single source of truth for Claude Code across every session.
> Read it fully before writing any code, creating any file, or running any command.
> Never deviate from the decisions recorded here without updating this file first.

---

## 1. Project identity

| Field | Value |
|---|---|
| Type | Developer platform / IDE-like web application |
| Stack | React 18 + Node.js 20 LTS |
| Monorepo tool | Turborepo |
| Package manager | pnpm (workspaces) |
| Language | TypeScript 5.x — strict mode everywhere, no `any` |
| Target | Mid-size team, scalable from day 1 |

---

## 2. Monorepo structure

```
/
├── CLAUDE.md                  ← this file
├── turbo.json                 ← pipeline config
├── pnpm-workspace.yaml
├── package.json               ← root (no source, only scripts)
│
├── apps/
│   ├── shell/                 ← React client (Vite + React 18)
│   └── docs/                  ← Documentation site (Next.js)
│
├── packages/
│   ├── sdk-types/             ← ALL shared TypeScript types, interfaces, enums
│   ├── event-bus/             ← Typed pub/sub (mitt-based)
│   ├── design-system/         ← React component library (Radix UI + Tailwind)
│   ├── plugin-sdk/            ← SDK shipped to plugin authors
│   └── utils/                 ← Pure utility functions (no React, no Node deps)
│
└── services/
    ├── auth/                  ← Auth service (Express + Passport)
    ├── plugin-registry/       ← Plugin publish / resolve / sign
    ├── exec-sandbox/          ← Code execution isolation (Docker/Firecracker)
    ├── collab/                ← Real-time collaboration (WebSocket + Yjs)
    ├── telemetry/             ← Metrics, audit trail, structured logs
    └── gateway/               ← API gateway (rate limiting, JWT verify, routing)
```

### Hard rules on imports

- `apps/shell` may import from `packages/*` only — never from `services/*`
- `services/*` may import from `packages/sdk-types`, `packages/utils` only
- `services/*` must never import from each other directly — communicate via HTTP or message queue
- `packages/plugin-sdk` must have zero Node.js dependencies — it runs in the browser sandbox
- `packages/sdk-types` is pure types — no runtime code, no imports from other packages

---

## 3. Technology decisions (locked — do not change without team discussion)

### Frontend (`apps/shell`)

| Concern | Decision |
|---|---|
| Bundler | Vite 5 |
| UI framework | React 18 (functional components + hooks only) |
| State management | Zustand (per-module slices, no global god store) |
| Editor core | Monaco Editor (`@monaco-editor/react`) |
| Styling | Tailwind CSS 3 + Radix UI primitives |
| Real-time sync | Yjs + `y-websocket` provider |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 (file-based via `createBrowserRouter`) |
| Testing | Vitest + React Testing Library |
| E2E | Playwright |

### Backend (all `services/*`)

| Concern | Decision |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Fastify 4 (not Express — better perf, built-in schema) |
| Auth | Passport.js + `passport-oauth2` + `passport-local` |
| JWT | `jose` library (not `jsonwebtoken` — Web Crypto API compatible) |
| Validation | Zod (shared schemas from `packages/sdk-types`) |
| ORM | Prisma (PostgreSQL) |
| Queue | BullMQ (Redis-backed) |
| WebSocket | `ws` library (in `services/collab`) |
| Testing | Vitest + supertest |

### Infrastructure

| Concern | Decision |
|---|---|
| Database | PostgreSQL 15 (primary) + Redis 7 (cache / sessions / queues) |
| Object storage | S3-compatible (MinIO locally, AWS S3 in prod) |
| Code execution | Docker with seccomp + no-new-privileges (Firecracker for prod) |
| Secrets | HashiCorp Vault (env vars in dev, Vault agent in prod) |
| Observability | OpenTelemetry SDK → Prometheus + Grafana + Loki + Sentry |
| Feature flags | Unleash (self-hosted) |
| Container orchestration | Kubernetes (Helm charts in `/deploy/helm`) |

---

## 4. TypeScript rules

- `"strict": true` in all `tsconfig.json` files — no exceptions
- No `any` — use `unknown` and narrow, or define a proper type
- No `as SomeType` casts — use type guards or Zod `.parse()`
- All public functions must have explicit return types
- All Zod schemas live in `packages/sdk-types/src/schemas/` and export both the schema and the inferred type:
  ```ts
  export const PluginManifestSchema = z.object({ ... });
  export type PluginManifest = z.infer<typeof PluginManifestSchema>;
  ```
- Event payloads on the event bus must be typed — no `Record<string, unknown>` event bodies
- All API request/response bodies validated with Zod at the service boundary

---

## 5. Plugin system — complete specification

### Plugin manifest (`plugin.manifest.json`)

Every plugin must ship a manifest. The schema is in `packages/sdk-types/src/schemas/plugin-manifest.ts`.

```json
{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "apiVersion": "1",
  "permissions": ["fs.read", "terminal.spawn", "network.fetch"],
  "entrypoint": "dist/index.js",
  "integrity": "sha384-<SRI hash of entrypoint>",
  "contributes": {
    "commands": [],
    "panels": [],
    "themes": [],
    "languageProviders": []
  }
}
```

### Allowed permissions

```
fs.read          — read files in the current workspace
fs.write         — write files in the current workspace
terminal.spawn   — open a terminal panel
network.fetch    — make outbound HTTP requests (proxied)
editor.decorate  — add decorations/highlights to the editor
editor.commands  — register commands in the command palette
ui.panel         — render a custom UI panel (sandboxed iframe)
settings.read    — read user settings relevant to the plugin
settings.write   — write settings in the plugin's own namespace
```

Any permission not in this list is rejected at install time.

### Sandbox rules (NEVER bypass)

- Plugin code runs in an `<iframe sandbox="allow-scripts">` — no `allow-same-origin`, no `allow-storage-access`
- All plugin ↔ host communication goes through `postMessage` only
- The host verifies `event.origin` on every message — reject anything not from the known plugin origin
- Plugin messages are validated against the declared permissions before the host acts on them
- Plugins receive a scoped capability token — not the user's JWT
- Resource limits: 50 MB memory, 10% CPU, 5-second timeout per RPC call
- Never use `vm.runInContext`, `eval`, or `new Function` as substitutes for iframe sandboxing

### Message bridge protocol

All plugin RPC calls use this envelope (defined in `packages/sdk-types/src/schemas/plugin-rpc.ts`):

```ts
interface PluginRPCRequest {
  id: string;           // uuid — for response correlation
  method: string;       // e.g. "fs.read"
  params: unknown;      // validated against method schema
  capabilityToken: string;
}

interface PluginRPCResponse {
  id: string;
  result?: unknown;
  error?: { code: string; message: string };
}
```

### Extension point API (host side)

Implemented in `apps/shell/src/plugin-host/extension-points/`:

```
commands/      — register/unregister command palette entries
panels/        — register sidebar or bottom panel components
themes/        — register color themes
lsp/           — register language server providers
fileWatchers/  — watch for file system changes
settings/      — register settings schema contributions
```

Each extension point is a class with `register()` and `unregister()` methods.

### Plugin lifecycle

1. User installs plugin → `services/plugin-registry` resolves the bundle
2. Registry verifies SRI hash against manifest integrity field
3. Registry validates manifest schema and permission list
4. Registry issues a scoped plugin token (short-lived JWT, signed separately)
5. Shell loads plugin bundle into sandboxed iframe
6. Plugin calls `PluginSDK.ready()` — host confirms token + capability grant
7. Plugin operates via message bridge
8. On uninstall/disable: host sends `plugin.deactivate` event, iframe is destroyed

---

## 6. Auth system — complete specification

### Token strategy

| Token | Lifetime | Storage | Usage |
|---|---|---|---|
| Access JWT | 15 minutes | Memory (React state) | All API calls — `Authorization: Bearer` |
| Refresh token | 7 days | `httpOnly` cookie (Secure, SameSite=Strict) | Silent refresh only |
| Plugin token | 1 hour | Memory inside iframe | Plugin RPC calls only |
| CSRF token | Per session | `sessionStorage` | Mutations on cookie-authenticated routes |

- Access tokens are never stored in `localStorage` or `sessionStorage`
- Refresh token rotation: every use issues a new refresh token and invalidates the old one
- Refresh token family tracking: if a reused (already-rotated) token is presented, invalidate the entire family

### RBAC roles

Defined in `packages/sdk-types/src/enums/roles.ts`:

```ts
enum Role {
  Owner      = 'owner',      // full control, billing
  Admin      = 'admin',      // manage members, plugins, settings
  Developer  = 'developer',  // write access to workspaces
  Viewer     = 'viewer',     // read-only
  Plugin     = 'plugin',     // scoped — only what manifest declares
}
```

Row-level security in PostgreSQL enforces these at the database layer — not just the API layer.

### OAuth2 providers

Supported: GitHub, GitLab, Google. Implemented in `services/auth/src/providers/`.

PKCE is required for all OAuth2 flows. State parameter is validated. Redirect URIs are whitelisted — never accept arbitrary redirects.

### Session architecture

```
Client → Gateway (JWT verify) → Service
                ↓
         Redis (session store)
         - token family tracking
         - active refresh tokens
         - rate limit counters
```

---

## 7. Real-time collaboration

### Technology

- **Yjs** — CRDT library for conflict-free document sync
- **y-websocket** — provider connecting Yjs to the collab service
- **services/collab** — WebSocket relay that broadcasts Yjs update messages

### Document model

Each workspace document is a `Y.Doc`. Subdocuments represent individual files. The collab service does not interpret document content — it relays binary Yjs updates and maintains awareness state (cursors, selections).

### Persistence

Yjs document state is persisted to PostgreSQL via `y-leveldb` adapter on the server. On reconnect, the server sends the full document state diff since the client's last known clock.

### Awareness

User presence (cursor position, selection, display name, color) is broadcast via Yjs awareness protocol — not via the main document CRDT.

---

## 8. Code execution sandbox

All user code execution goes through `services/exec-sandbox`. No exceptions.

### Runtime isolation

- **Development**: Docker container per execution, `--security-opt seccomp=/profiles/sandbox.json`, `--cap-drop ALL`, `--no-new-privileges`, network isolated unless `network.fetch` permission granted
- **Production**: Firecracker microVM per execution

### Limits per execution

```
CPU:      1 vCPU, max 10 seconds wall clock
Memory:   256 MB
Disk:     100 MB tmpfs (no persistent writes)
Network:  blocked by default; proxied if network.fetch granted
Processes: max 32
```

### API contract

`POST /execute` → `packages/sdk-types/src/schemas/execution.ts`

```ts
interface ExecutionRequest {
  language: 'javascript' | 'typescript' | 'python' | 'bash';
  code: string;
  stdin?: string;
  timeoutMs?: number; // max 10000
  env?: Record<string, string>; // allowlisted keys only
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
```

---

## 9. Security model

### Three trust zones

**Zone 0 — untrusted (public internet)**
All plugin uploads, browser clients, OAuth callbacks, webhooks.

**Zone 1 — trust boundary (edge + gateway)**
CDN/WAF → CSP headers → JWT verify → rate limiter → RBAC middleware.
Nothing in Zone 2 is reachable from Zone 0 directly.

**Zone 2 — internal (private network)**
Services communicate over mTLS. No direct internet egress.
Secrets via Vault. Audit log is append-only (WORM).

### HTTP security headers (set in `services/gateway`)

```
Content-Security-Policy: default-src 'none'; script-src 'nonce-{nonce}' 'strict-dynamic'; style-src 'self'; img-src 'self' data:; connect-src 'self' wss://collab.{domain}; frame-src 'none'; object-src 'none'; base-uri 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Plugin iframes get a separate, stricter CSP via the `csp` iframe attribute.

### Rate limits (enforced in `services/gateway`, state in Redis)

```
Unauthenticated:    20 req/min per IP
Authenticated:     200 req/min per user
Plugin token:       50 req/min per plugin instance
Auth endpoints:      5 req/min per IP (login, register, reset)
Exec sandbox:        10 executions/min per user
```

### Input validation rules

- All inputs validated with Zod at the service boundary — never trust the gateway to have done it
- File paths sanitized with `path.resolve` + allowlist check — no `../` traversal
- Plugin bundle filenames must match `[a-z0-9-_.]+` — no executable extensions except `.js`
- SQL: Prisma only — no raw query strings concatenated with user input
- All user-generated content stored as-is and escaped at render time — never sanitized at ingest

### Audit trail

Every destructive or privileged action writes to the `audit_log` table:

```ts
interface AuditEntry {
  id: string;
  timestamp: Date;
  actorId: string;
  actorRole: Role;
  action: string;         // e.g. "plugin.install", "file.delete", "member.remove"
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}
```

The audit log table has `INSERT` permission only for services — no `UPDATE` or `DELETE`.

---

## 10. Database schema guidelines

### Conventions

- All table names: `snake_case`, plural (`users`, `plugin_installs`)
- All column names: `snake_case`
- Primary keys: `uuid` generated at the application layer (`crypto.randomUUID()`)
- All tables have `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ`
- Soft deletes via `deleted_at TIMESTAMPTZ NULL` — never hard-delete user data
- Row-level security enabled on all tables — policies defined per role

### Core tables

```
users                  — id, email, display_name, role, oauth_provider, deleted_at
workspaces             — id, name, owner_id, created_at
workspace_members      — workspace_id, user_id, role, invited_at, accepted_at
plugins                — id, name, publisher_id, latest_version, published_at
plugin_versions        — id, plugin_id, version, integrity_hash, manifest, bundle_url
plugin_installs        — workspace_id, plugin_id, version, installed_by, installed_at
audit_log              — id, timestamp, actor_id, action, resource_type, resource_id, metadata
refresh_token_families — id, user_id, family_id, token_hash, used_at, revoked_at
feature_flags          — id, name, enabled, rollout_pct, created_at
```

### Migrations

All schema changes via Prisma migrations. Migration files are never edited after being applied. Destructive changes (drop column, drop table) require a two-phase migration: phase 1 stops writes, phase 2 drops.

---

## 11. Event bus

Defined in `packages/event-bus/src/index.ts`. Uses `mitt` under the hood with a typed event map.

### Event naming convention

`<domain>.<entity>.<verb>` — all lowercase, dot-separated.

### Core events

```ts
interface EventMap {
  // Editor
  'editor.file.opened':    { filePath: string; workspaceId: string };
  'editor.file.saved':     { filePath: string; workspaceId: string };
  'editor.file.closed':    { filePath: string };

  // Plugin lifecycle
  'plugin.activated':      { pluginId: string; version: string };
  'plugin.deactivated':    { pluginId: string; reason: string };
  'plugin.error':          { pluginId: string; error: string };

  // Workspace
  'workspace.opened':      { workspaceId: string };
  'workspace.closed':      { workspaceId: string };
  'workspace.member.added': { workspaceId: string; userId: string; role: Role };

  // Auth
  'auth.session.started':  { userId: string };
  'auth.session.expired':  { userId: string };
  'auth.token.refreshed':  { userId: string };

  // Execution
  'exec.started':          { executionId: string; language: string };
  'exec.completed':        { executionId: string; exitCode: number; durationMs: number };
  'exec.timeout':          { executionId: string };
}
```

Add new events to the map — never use untyped `emit('some-string', data)`.

---

## 12. Observability

### OpenTelemetry setup

Every service initializes the OTel SDK before any other import. The SDK is configured in `services/<name>/src/telemetry.ts` and called at the top of `main.ts`:

```ts
// MUST be first import in main.ts
import './telemetry';
```

### Trace ID propagation

Trace IDs flow from browser → gateway → service → database. Every log line includes the trace ID. The gateway injects `X-Trace-Id` on responses so the client can correlate errors.

### Structured logging

All logs are JSON. Log shape:

```json
{
  "timestamp": "2025-01-01T00:00:00.000Z",
  "level": "info",
  "service": "auth",
  "traceId": "abc123",
  "spanId": "def456",
  "userId": "uuid",
  "message": "token refreshed",
  "durationMs": 12
}
```

Never use `console.log` in services — use the shared logger from `packages/utils/src/logger.ts`.

### Metrics to instrument

- Request latency (p50, p95, p99) per route
- Plugin activation count and failure rate
- Execution sandbox queue depth and completion rate
- Auth token refresh rate and failure rate
- WebSocket connection count (collab service)
- Database query latency per model

### Alerts

Define in Grafana. Minimum set:
- Error rate > 1% for any service → page
- p99 latency > 2s → warn
- Execution sandbox queue depth > 100 → warn
- Auth failure rate > 10/min per IP → block + alert

---

## 13. Workspace snapshots

Users can export and restore a full workspace state. Snapshot format (stored in S3):

```ts
interface WorkspaceSnapshot {
  version: '1';
  workspaceId: string;
  capturedAt: string;
  openFiles: string[];
  activePlugins: Array<{ id: string; version: string }>;
  layout: PanelLayout;
  editorState: Record<string, EditorViewState>;
  settings: WorkspaceSettings;
}
```

Snapshots are versioned. Import validates the schema version before applying.

---

## 14. Feature flags

Use Unleash client from `packages/utils/src/flags.ts`. Never hardcode `if (env === 'production')` checks.

```ts
import { isEnabled } from '@platform/utils/flags';

if (isEnabled('collab.yjs-awareness')) {
  // ...
}
```

All flags are defined in the Unleash UI and referenced by string key. Document every flag in `/docs/feature-flags.md`.

---

## 15. Development workflow

### Commands (run from repo root)

```bash
pnpm install              # install all workspace deps
pnpm dev                  # start all services + shell in parallel (via turbo)
pnpm build                # build all packages and apps
pnpm test                 # run all tests (vitest)
pnpm test:e2e             # run Playwright tests
pnpm lint                 # ESLint + tsc --noEmit across all packages
pnpm typecheck            # tsc --noEmit only
pnpm db:migrate           # run pending Prisma migrations
pnpm db:seed              # seed development database
pnpm db:studio            # open Prisma Studio
```

### Git conventions

- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- PRs require: passing CI, at least one approval, no TypeScript errors, no ESLint errors
- Changesets required for any change to `packages/*` (run `pnpm changeset`)

### Local environment

All services run locally via `docker-compose.dev.yml`. It starts:
- PostgreSQL 15
- Redis 7
- MinIO (S3-compatible)
- Unleash (feature flags)

Copy `.env.example` to `.env` at repo root — never commit `.env`.

---

## 16. Testing strategy

### Unit tests (Vitest)

- Every utility function in `packages/utils` has a unit test
- Every Zod schema in `packages/sdk-types` has parse + rejection tests
- Every service route has a test using `supertest` + in-memory DB
- Plugin manifest validation has exhaustive tests for each permission

### Integration tests

- Auth flow: register → login → refresh → logout
- Plugin install: upload → verify → sandbox load → RPC call → uninstall
- Exec sandbox: run code in each language → get result → timeout handling

### E2E tests (Playwright)

- Core editor: open file, edit, save, see changes persisted
- Plugin: install from registry, activate, use command, uninstall
- Collab: two users open same file, one types, other sees change

### Coverage targets

- `packages/*`: 90%+ line coverage
- `services/*`: 80%+ line coverage
- `apps/shell`: 70%+ line coverage (UI tested via Playwright)

---

## 17. Banned patterns — Claude Code must never use these

```
❌ eval(), new Function(str), vm.runInContext()      — use iframe sandbox
❌ any                                               — use unknown + type guard
❌ as SomeType                                       — use Zod .parse() or type guard
❌ console.log in services                           — use shared logger
❌ localStorage / sessionStorage for tokens          — tokens in memory only
❌ process.env.VAR directly in service code          — use typed config module
❌ Raw SQL string concatenation                      — Prisma only
❌ services/* importing from each other              — HTTP or queue only
❌ if (process.env.NODE_ENV === 'production')         — use Unleash feature flags
❌ ../../../ relative imports across package boundaries — use workspace aliases
❌ Plugin code touching host DOM directly            — postMessage bridge only
❌ Storing refresh tokens in memory                  — httpOnly cookie only
❌ Skipping Zod validation at service boundaries    — always validate
❌ Hard-deleting user data                          — soft delete via deleted_at
❌ Committing secrets or .env files                  — use Vault / .env.example
```

---

## 18. Package aliases (tsconfig paths)

```json
{
  "@platform/types":   ["packages/sdk-types/src/index.ts"],
  "@platform/events":  ["packages/event-bus/src/index.ts"],
  "@platform/ui":      ["packages/design-system/src/index.ts"],
  "@platform/sdk":     ["packages/plugin-sdk/src/index.ts"],
  "@platform/utils":   ["packages/utils/src/index.ts"]
}
```

Always use these aliases — never relative paths crossing package boundaries.

---

## 19. Initial build order

When scaffolding from scratch, implement in this order. Each step depends on the previous.

```
Step 1  — packages/sdk-types         (all shared types, schemas, enums)
Step 2  — packages/utils             (logger, config loader, crypto helpers)
Step 3  — packages/event-bus         (typed pub/sub)
Step 4  — services/gateway           (JWT verify, rate limit, routing)
Step 5  — services/auth              (OAuth2, JWT issue, refresh rotation)
Step 6  — packages/design-system     (base components, tokens, Tailwind config)
Step 7  — apps/shell scaffold        (Vite config, router, auth context, layout)
Step 8  — services/plugin-registry   (publish, resolve, integrity check)
Step 9  — apps/shell plugin-host     (iframe sandbox, message bridge, extension points)
Step 10 — packages/plugin-sdk        (SDK for plugin authors)
Step 11 — services/exec-sandbox      (Docker runner, language executors)
Step 12 — services/collab            (WebSocket relay, Yjs sync)
Step 13 — services/telemetry         (OTel, audit log, metrics)
Step 14 — Workspace snapshots        (export/import in shell + S3)
Step 15 — E2E tests + Playwright     (full user flow coverage)
```

---

*Last updated: project inception. Update this file whenever an architectural decision changes.*

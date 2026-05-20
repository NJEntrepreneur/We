---
"@platform/ui": patch
"@platform/events": patch
"@platform/types": patch
"@platform/utils": patch
"@platform/sdk": patch
---

Fix TypeScript strict-mode errors across all packages

- `@platform/ui`: `InputProps.error` typed as `string | undefined` so React Hook Form spreads satisfy `exactOptionalPropertyTypes`
- `@platform/events`: `PlatformEventMap` changed from `interface` to `type` alias to satisfy mitt's `Record<EventType, unknown>` generic constraint
- `@platform/types`: Added Zod schema parse/rejection tests (15 tests covering roles, auth, plugin manifest, execution, RPC)
- `@platform/utils`: `crypto.ts` — use `Uint8Array<ArrayBuffer>` via `ArrayLike` constructor overload to satisfy `SubtleCrypto.BufferSource`; drop explicit `CryptoKey` return annotation on private helper so Node.js and DOM compilation contexts both resolve correctly
- `@platform/sdk`: Added `zod` runtime dependency; added unit tests (5 tests for SDK lifecycle)

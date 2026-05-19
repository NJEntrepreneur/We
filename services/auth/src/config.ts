import { createConfigReader } from '@platform/utils';

export function buildConfig(source = process.env) {
  const cfg = createConfigReader(source);
  return {
    port:              cfg.port('PORT', 4001),
    host:              cfg.withDefault('HOST', '0.0.0.0'),
    databaseUrl:       cfg.required('DATABASE_URL'),
    jwtAccessSecret:   cfg.required('JWT_ACCESS_SECRET'),
    jwtRefreshSecret:  cfg.required('JWT_REFRESH_SECRET'),
    cookieSecret:      cfg.required('COOKIE_SECRET'),
    secureCookie:      cfg.boolean('SECURE_COOKIE', false),
    // OAuth2 — optional in dev, required in prod
    githubClientId:     cfg.optional('GITHUB_CLIENT_ID'),
    githubClientSecret: cfg.optional('GITHUB_CLIENT_SECRET'),
    gitlabClientId:     cfg.optional('GITLAB_CLIENT_ID'),
    gitlabClientSecret: cfg.optional('GITLAB_CLIENT_SECRET'),
    googleClientId:     cfg.optional('GOOGLE_CLIENT_ID'),
    googleClientSecret: cfg.optional('GOOGLE_CLIENT_SECRET'),
    callbackBaseUrl:    cfg.withDefault('CALLBACK_BASE_URL', 'http://localhost:4001'),
  } as const;
}

export type AuthConfig = ReturnType<typeof buildConfig>;

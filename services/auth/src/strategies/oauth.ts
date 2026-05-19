import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import type { AuthConfig } from '../config.js';

// §6: OAuth2 provider strategies — GitHub, GitLab, Google.
// PKCE is required; state param validated per §6.
// Redirect URIs are whitelisted — callbackURL is constructed from config only.

type VerifyCallback = (
  accessToken: string,
  refreshToken: string,
  profile: Record<string, unknown>,
  done: (err: Error | null, user?: unknown) => void,
) => void;

function makeVerify(): VerifyCallback {
  return (_accessToken, _refreshToken, profile, done) => {
    // Profile is provider-specific; services/auth will normalise to LocalUser in a
    // future implementation that hits the user DB.  For now the raw profile is
    // passed through so the strategy compiles and is registered correctly.
    done(null, profile);
  };
}

export function registerOAuthStrategies(config: AuthConfig): void {
  if (config.githubClientId && config.githubClientSecret) {
    passport.use(
      'github',
      new OAuth2Strategy(
        {
          authorizationURL: 'https://github.com/login/oauth/authorize',
          tokenURL:         'https://github.com/login/oauth/access_token',
          clientID:         config.githubClientId,
          clientSecret:     config.githubClientSecret,
          callbackURL:      `${config.callbackBaseUrl}/auth/callback/github`,
          pkce:             true,
          state:            true,
        },
        makeVerify(),
      ),
    );
  }

  if (config.gitlabClientId && config.gitlabClientSecret) {
    passport.use(
      'gitlab',
      new OAuth2Strategy(
        {
          authorizationURL: 'https://gitlab.com/oauth/authorize',
          tokenURL:         'https://gitlab.com/oauth/token',
          clientID:         config.gitlabClientId,
          clientSecret:     config.gitlabClientSecret,
          callbackURL:      `${config.callbackBaseUrl}/auth/callback/gitlab`,
          pkce:             true,
          state:            true,
        },
        makeVerify(),
      ),
    );
  }

  if (config.googleClientId && config.googleClientSecret) {
    passport.use(
      'google',
      new OAuth2Strategy(
        {
          authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenURL:         'https://oauth2.googleapis.com/token',
          clientID:         config.googleClientId,
          clientSecret:     config.googleClientSecret,
          callbackURL:      `${config.callbackBaseUrl}/auth/callback/google`,
          pkce:             true,
          state:            true,
        },
        makeVerify(),
      ),
    );
  }
}

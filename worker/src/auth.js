// Better Auth for Split-Flap: Google sign-in only, sessions in D1. Kept in its own
// module so the migration script (scripts/gen-auth-sql.mjs) builds its SQL from the
// same options the Worker runs with.
//
// Privacy choices (see the privacy notice): no IP address or user agent on sessions,
// no Google tokens on the account, no profile picture, no telemetry. The full name
// is kept and the app shows the first.

const NO_TOKENS = { accessToken: null, refreshToken: null, idToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null };

export function authOptions(env, database) {
  const base = env.BASE_URL || 'https://maclaine.se';
  return {
    database,
    baseURL: base,
    basePath: '/split-flap/api/auth',
    // a sign-in that fails (the state cookie missing, say) goes back to the app with ?error=,
    // where the app says so plainly, never to Better Auth's bare error page
    onAPIError: { errorURL: base + '/split-flap' },   // no trailing slash: that address redirects
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [base],
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: 'select_account',   // Better Auth asks for openid, email and profile by default, nothing more
        mapProfileToUser: profile => ({ name: profile.name, image: null })
      }
    },
    user: {
      deleteUser: {
        enabled: true,
        // the boards go with the account
        afterDelete: async user => { if (env.DB) { await env.DB.prepare('DELETE FROM board WHERE user_id = ?').bind(user.id).run(); await env.DB.prepare('DELETE FROM blueprint WHERE user_id = ?').bind(user.id).run(); await env.DB.prepare('DELETE FROM connection WHERE user_id = ?').bind(user.id).run(); for (const t of ['playlist', 'settings', 'migration']) await env.DB.prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(user.id).run(); } }
      }
    },
    // a phone should not have to sign in again every week
    // The cookie cache keeps a signed copy of the session in the cookie for five minutes,
    // so most requests skip the database lookup (and fit the free plan's CPU time).
    session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 300 } },
    advanced: {
      ipAddress: { disableIpTracking: true },
      cookiePrefix: 'sf',
      // only the API needs the session, so the cookie never reaches the app or the site
      defaultCookieAttributes: { path: '/split-flap/api', sameSite: 'lax', httpOnly: true, secure: base.startsWith('https://') }
    },
    databaseHooks: {
      session: { create: { before: async session => ({ data: Object.assign({}, session, { ipAddress: null, userAgent: null }) }) } },
      // Google's tokens are not kept: Split-Flap never calls Google after sign-in, so
      // storing them would only be a credential at rest.
      account: {
        create: { before: async acc => ({ data: Object.assign({}, acc, NO_TOKENS) }) },
        update: { before: async acc => ({ data: Object.assign({}, acc, NO_TOKENS) }) }
      }
    },
    // in memory, per Worker instance: a database-backed limit would spend D1 writes
    rateLimit: { enabled: true, storage: 'memory', window: 60, max: 30 },
    telemetry: { enabled: false }
  };
}

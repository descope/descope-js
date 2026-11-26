export type SameSite = 'Strict' | 'Lax' | 'None';
export type CookieConfig =
  | boolean
  | {
      sameSite?: SameSite;
      secure?: boolean;
      cookieName?: string;
      domain?: string;
    };

export type PersistTokensOptions<A extends CookieConfig> = {
  // If true, response's tokens will be persisted - session-token in DS cookie, and refresh-token in local storage
  // In addition, the stored refresh-token will be automatically passed to the sdk functions, unless it was provided
  persistTokens?: A;
  // Prefix for the keys used to store the tokens locally (local storage)
  storagePrefix?: string;
  // Mark the flow run as preview preventing the tokens from being persisted
  preview?: boolean;
  // If true, session token (jwt) will be stored on cookie. Otherwise, the session token will be
  // stored on local storage and can accessed with getSessionToken function
  // Use this option if session token will stay small (less than 1k)
  // NOTE: Session token can grow, especially in cases of using authorization, or adding custom claims
  sessionTokenViaCookie?: A extends false ? never : true | CookieConfig;
  // If true, store the refresh token in a JavaScript-readable cookie. Otherwise,
  // store it in localStorage, where it is vulnerable to theft via XSS.
  // For HttpOnly refresh cookies, configure cookie management in the Descope project.
  // Use this option if you need server-side access to the refresh token (e.g., in Next.js middleware)
  refreshTokenViaCookie?: A extends false ? never : true | CookieConfig;
};

// Internal type to store the last used cookie options
export type LastCookieOptions = {
  session?: { domain?: string; path?: string };
  refresh?: { domain?: string; path?: string };
};

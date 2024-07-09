export type PersistTokensOptions<A extends boolean> = {
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
  sessionTokenViaCookie?: A extends true ? boolean : never;
};

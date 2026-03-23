export type AutoRefreshConfig = boolean | { customActivityTracking?: boolean };

export type AutoRefreshOptions = {
  // If true, sdk object will trigger refresh on init, and in intervals manner, in order to to retain a valid session token
  // If an object with `customActivityTracking: true`, refresh is skipped for idle users until `sdk.markUserActive()` is called
  autoRefresh?: AutoRefreshConfig;
};

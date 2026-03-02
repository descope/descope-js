export type AutoRefreshConfig = boolean | { whenActive?: boolean };

export type AutoRefreshOptions = {
  // If true, sdk object will trigger refresh on init, and in intervals manner, in order to to retain a valid session token
  // If an object with `whenActive: true`, refresh is skipped for idle users until `sdk.markActive()` is called
  autoRefresh?: AutoRefreshConfig;
};

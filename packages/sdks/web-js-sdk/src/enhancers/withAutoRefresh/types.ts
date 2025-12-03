export type AutoRefreshOptions = {
  // If true, sdk object will trigger refresh on init, and in intervals manner, in order to to retain a valid session token
  // If an object, allows fine-grained control over refresh behavior
  autoRefresh?:
    | boolean
    | {
        // If true, refresh will happen regardless of window visibility (legacy behavior)
        ignoreVisibility?: boolean;
      };
};

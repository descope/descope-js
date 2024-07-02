export type LastLoggedInUserOptions = {
  // If true, the last authenticated user will be stored in local storage
  // and will be used in the next flow start request
  // Default is true
  storeLastAuthenticatedUser?: boolean;
  // If true, the last authenticated user will be kept in local storage even after logout
  // and will be used in the next flow start request
  // This option is relevant only if storeLastAuthenticatedUser is true
  // Default is false
  keepLastAuthenticatedUserAfterLogout?: boolean;
};

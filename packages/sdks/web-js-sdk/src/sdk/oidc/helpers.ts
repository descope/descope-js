export const hasOidcParamsInUrl = () => {
  return (
    window.location.search.includes('code') &&
    window.location.search.includes('state')
  );
};

export const removeOidcParamFromUrl = () => {
  // Retrieve the current URL from the browser's address bar
  const currentUrl = new URL(window.location.href);

  // Remove the 'code' and 'state' query parameters if it exist
  currentUrl.searchParams.delete('code');
  currentUrl.searchParams.delete('state');

  // Update the URL displayed in the browser without reloading the page
  window.history.replaceState({}, document.title, currentUrl.toString());
};

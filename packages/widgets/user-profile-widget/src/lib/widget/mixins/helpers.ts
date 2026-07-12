export function getUrlParam(paramName: string) {
  const urlParams = new URLSearchParams(window.location.search);

  return urlParams.get(paramName);
}

export function resetUrlParam(paramName: string) {
  if (window.history.replaceState && getUrlParam(paramName)) {
    const newUrl = new URL(window.location.href);
    const search = new URLSearchParams(newUrl.search);
    search.delete(paramName);
    newUrl.search = search.toString();
    window.history.replaceState({}, '', newUrl.toString());
  }
}

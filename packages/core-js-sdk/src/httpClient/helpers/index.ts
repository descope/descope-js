export { default as createFetchLogger } from './createFetchLogger';

export function transformSetCookie(setCookieHeader: string) {
  // Split the header by semicolons to separate different attributes
  var cookiesString = setCookieHeader.split(';');

  return cookiesString.reduce((acc, cookie) => {
    const [key, value] = cookie.split('=');
    return {
      ...acc,
      [key.trim()]: value,
    };
  }, {});
}

// Detect Safari running on iPhone specifically.
function isIphoneSafari() {
  const ua = navigator.userAgent || '';
  const isIphone = /\b(iPhone)\b/.test(ua);
  // Safari UA contains 'Safari' and usually 'Version/X', exclude other iOS browsers
  const isSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome|Chromium/.test(ua);

  return isIphone && isSafari;
}

/**
 * Opens a centered popup window.
 *
 * Must be called synchronously from a user gesture - any `await` before it and
 * the browser blocks the popup. The window is opened with a blank URL first and
 * navigated afterwards: Safari on Mac otherwise detects authentication URLs and
 * replaces the popup with a native macOS auth dialog, which has no web surface
 * for us to drive.
 *
 * Returns `null` when the browser blocked the popup, so callers can report it
 * rather than throwing on a property of `null`.
 *
 * NOTE: `web-component/src/lib/helpers/helpers.ts` still carries its own copy of
 * this, used by the OAuth redirect step. The two are intentionally not merged
 * yet - two existing test files spy on that module's export
 * (`jest.spyOn(helpers, 'openCenteredPopup')`), so consolidating means editing
 * tests on a production auth path. That is worth doing when this ships, not for
 * a POC.
 */
export const openCenteredPopup = (
  url: string,
  title: string,
  w: number,
  h: number,
): Window | null => {
  const dualScreenLeft =
    window.screenLeft !== undefined
      ? window.screenLeft
      : (window.screen as any).left;
  const dualScreenTop =
    window.screenTop !== undefined
      ? window.screenTop
      : (window.screen as any).top;

  const width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    window.screen.width;
  const height =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    window.screen.height;

  const left = (width - w) / 2 + dualScreenLeft;
  const top = (height - h) / 2 + dualScreenTop;

  const initialUrl = isIphoneSafari() ? 'about:blank' : '';
  const popup = window.open(
    initialUrl,
    title,
    `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`,
  );

  // a blocked popup is a real case on iOS Safari, not an exception
  if (!popup) return null;

  popup.location.href = url;
  popup.focus();

  return popup;
};

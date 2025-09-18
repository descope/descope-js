export const isIphoneSafari = () => {
  const ua = navigator.userAgent || '';
  const isIphone = /\b(iPhone)\b/.test(ua);
  // Safari UA contains 'Safari' and usually 'Version/X', exclude other iOS browsers
  const isSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome|Chromium/.test(ua);

  return isIphone && isSafari;
};

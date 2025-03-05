require('jest-fetch-mock').enableMocks();
window.console.warn = () => {
  return '';
};
// eslint-disable-next-line no-undef
global.CSSStyleSheet.prototype.replaceSync = jest.fn();

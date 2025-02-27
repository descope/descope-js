require('jest-fetch-mock').enableMocks();
window.console.warn = () => {
  return '';
};
global.CSSStyleSheet.prototype.replaceSync = jest.fn();

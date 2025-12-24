global.CSSStyleSheet.prototype.replaceSync = jest.fn();

// Set up console spies before any modules are imported
// This is necessary because the logger mixin binds console methods at module load time
jest.spyOn(console, 'error');
jest.spyOn(console, 'warn');
jest.spyOn(console, 'info');
jest.spyOn(console, 'debug');

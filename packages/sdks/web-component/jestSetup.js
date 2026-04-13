global.CSSStyleSheet.prototype.replaceSync = jest.fn();

// Workaround for source-map@0.6.1 bug with null mappings (triggered by ts-jest compiled async/await code)
const origPrepareStackTrace = Error.prepareStackTrace;
Error.prepareStackTrace = function (err, stack) {
  try {
    return origPrepareStackTrace
      ? origPrepareStackTrace(err, stack)
      : stack.toString();
  } catch (e) {
    return [err.toString()]
      .concat(stack.map((f) => '    at ' + f.toString()))
      .join('\n');
  }
};

// Set up console spies before any modules are imported
// This is necessary because the logger mixin binds console methods at module load time
jest.spyOn(console, 'error');
jest.spyOn(console, 'warn');
jest.spyOn(console, 'info');
jest.spyOn(console, 'debug');

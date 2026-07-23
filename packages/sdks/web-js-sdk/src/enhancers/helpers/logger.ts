const logger = {
  debug: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.debug(...args);
  },
  warn: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.warn(...args);
  },
};

export default logger;

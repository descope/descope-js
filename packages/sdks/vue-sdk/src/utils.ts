export const wrapInTry =
  <T extends Array<any>, U>(fn: (...args: T) => U) =>
  (...args: T): U => {
    let res: U;
    try {
      res = fn(...args);
    } catch (err) {
      console.error(err); // eslint-disable-line no-console
    }
    return res;
  };

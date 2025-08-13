export const waitFor = async (fn: () => any, timeout: number) =>
  new Promise<Element | null>((resolve) => {
    const interval = setInterval(() => {
      const value = fn();
      if (value) {
        clearInterval(interval);
        resolve(value);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      resolve(null);
    }, timeout);
  });

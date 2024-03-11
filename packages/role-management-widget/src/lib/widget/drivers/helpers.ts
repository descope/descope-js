import { RefOrRefFn } from './types';

export const waitForElement = async (ele: RefOrRefFn, timeout: number) =>
  new Promise<Element | null>((resolve) => {
    const interval = setInterval(() => {
      const element = typeof ele === 'function' ? ele() : ele;
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      resolve(null);
    }, timeout);
  });

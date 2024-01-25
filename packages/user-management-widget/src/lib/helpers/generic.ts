// preventing duplicate separators
export const pathJoin = (...paths: string[]) =>
  paths.join('/').replace(/\/+/g, '/');

const compareArrays = (array1: any[], array2: any[]) =>
  array1.length === array2.length &&
  array1.every((value: any, index: number) => value === array2[index]);

export const withMemCache = <I extends any[], O>(fn: (...args: I) => O) => {
  let prevArgs: any[];
  let cache: any;
  return (...args: I) => {
    if (prevArgs && compareArrays(prevArgs, args)) return cache as O;

    prevArgs = args;
    cache = fn(...args);

    return cache as O;
  };
};

export const kebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_.]+/g, '-')
    .toLowerCase();

export const isObjEmpty = (obj: object) =>
  Object.keys(obj).length === 0 && obj.constructor === Object;

export const pluralize =
  (amount: number) =>
  (strings: TemplateStringsArray, ...expressions: (string | number)[][]) =>
    strings.reduce(
      (acc, str, idx) =>
        `${acc}${str}${expressions?.[idx]?.[amount > 1 ? 1 : 0] || ''}`,
      '',
    );

export const debounce = (fn: Function, ms = 500) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function debounced(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

import { from, Observable } from 'rxjs';

export type Observablefied<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => Promise<infer R>
    ? (...args: Args) => Observable<R>
    : T[K] extends (...args: infer Args) => infer R
      ? (...args: Args) => R
      : T[K] extends object
        ? Observablefied<T[K]>
        : T[K];
};

export function observabilify<T>(value: T): Observablefied<T> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const observableValue: any = {};

  for (const key in value) {
    if (typeof value[key] === 'function') {
      const fn = value[key] as (...args: unknown[]) => unknown;
      observableValue[key] = (...args: unknown[]) => {
        const fnResult = fn(...args);
        if (fnResult instanceof Promise) {
          return from(fnResult);
        } else {
          return fnResult;
        }
      };
    } else if (typeof value[key] === 'object' && value[key] !== null) {
      observableValue[key] = observabilify(value[key]);
    } else {
      observableValue[key] = value[key];
    }
  }

  return observableValue as Observablefied<T>;
}

type Fn = (arg: any) => any;

export function compose<Input, A1>(
  fn1: (input: Input) => A1,
): (input: Input) => A1;

export function compose<Input, A1, A2>(
  fn1: (input: Input) => A1,
  fn2: (input: A1) => A2,
): (input: Input) => A2;

export function compose<Input, A1, A2, A3>(
  fn1: (input: Input) => A1,
  fn2: (input: A1) => A2,
  fn3: (input: A2) => A3,
): (input: Input) => A3;

export function compose<Input, A1, A2, A3, A4>(
  fn1: (input: Input) => A1,
  fn2: (input: A1) => A2,
  fn3: (input: A2) => A3,
  fn4: (input: A3) => A4,
): (input: Input) => A4;

export function compose<Input, A1, A2, A3, A4, A5>(
  fn1: (input: Input) => A1,
  fn2: (input: A1) => A2,
  fn3: (input: A2) => A3,
  fn4: (input: A3) => A4,
  fn5: (input: A4) => A5,
): (input: Input) => A5;

export function compose<Input, A1, A2, A3, A4, A5, A6>(
  fn1: (input: Input) => A1,
  fn2: (input: A1) => A2,
  fn3: (input: A2) => A3,
  fn4: (input: A3) => A4,
  fn5: (input: A4) => A5,
  fn6: (input: A5) => A6,
): (input: Input) => A6;

export function compose<Input, A1, A2, A3, A4, A5, A6, A7>(
  fn1: (input: Input) => A1,
  fn2: (input: A1) => A2,
  fn3: (input: A2) => A3,
  fn4: (input: A3) => A4,
  fn5: (input: A4) => A5,
  fn6: (input: A5) => A6,
  fn7: (input: A6) => A7,
): (input: Input) => A7;

export function compose<Input, A1, A2, A3, A4, A5, A6, A7, A8>(
  fn1: (input: Input) => A1,
  fn2: (input: A1) => A2,
  fn3: (input: A2) => A3,
  fn4: (input: A3) => A4,
  fn5: (input: A4) => A5,
  fn6: (input: A5) => A6,
  fn7: (input: A6) => A7,
  fn8: (input: A7) => A8,
): (input: Input) => A8;

export function compose<Input, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
  fn1: (input: Input) => A1,
  fn2: (input: A1) => A2,
  fn3: (input: A2) => A3,
  fn4: (input: A3) => A4,
  fn5: (input: A4) => A5,
  fn6: (input: A5) => A6,
  fn7: (input: A6) => A7,
  fn8: (input: A7) => A8,
  fn9: (input: A8) => A9,
): (input: Input) => A9;

export function compose<Input, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(
  fn1: (input: Input) => A1,
  fn2: (input: A1) => A2,
  fn3: (input: A2) => A3,
  fn4: (input: A3) => A4,
  fn5: (input: A4) => A5,
  fn6: (input: A5) => A6,
  fn7: (input: A6) => A7,
  fn8: (input: A7) => A8,
  fn9: (input: A8) => A9,
  fn10: (input: A9) => A10,
): (input: Input) => A10;

/**
 * Currently there is no way to create a compose function in Typescript without using overloading
 * This function currently support up to 10 wrappers
 * If needed you can add more by duplicating the type and add more parameters
 */

export function compose(...args: Fn[]) {
  return (data: any) => args.reduce((acc, elem) => elem(acc), data) as any;
}

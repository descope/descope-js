import { ResponseData, SdkResponse } from '../../sdk/types';

// return true if received an object type, otherwise false
type IsObject<T> = T extends Array<any>
  ? false
  : T extends Function
  ? false
  : T extends object
  ? true
  : false;

type Tail<T extends ReadonlyArray<string>> = T extends readonly [
  head: any,
  ...tail: infer Tail_
]
  ? Tail_
  : never;

// returns the first array element type
type Head<T extends ReadonlyArray<string>> = T extends readonly []
  ? never
  : T[0];

type SdkResponseType<F extends SdkFn<ResponseData>> = F extends SdkFn<infer U>
  ? U
  : never;

// a helper type that helps extracting the SDK fn types
type SdkFnWrapperInternal<
  F extends SdkFn<ResponseData>,
  R extends ResponseData
> = (
  fn: (...args: Parameters<F>) => ReturnType<F>
) => (
  ...args: Parameters<F>
) => Promise<
  SdkResponse<
    R extends Record<string, never>
      ? SdkResponseType<F>
      : SdkResponseType<F> & R
  >
>;

type PrependDot<T extends string> = [T] extends [never] ? '' : `.${T}`;

// returns a union of all the available paths we can wrap (SDK functions) in an SDK instance
export type SdkFnsPaths<T extends object> = keyof T extends infer K
  ? K extends string & keyof T
    ? IsObject<T> extends false
      ? never
      : T[K] extends SdkFn<ResponseData>
      ? K
      : IsObject<T[K]> extends false
      ? never
      : T[K] extends object
      ? `${K}${PrependDot<SdkFnsPaths<T[K]>>}`
      : never
    : never
  : never;

// replace the type of multiple paths
export type ReplacePaths<
  Obj extends object,
  Paths extends ReadonlyArray<string>,
  WrapperData extends Record<string, any>
> = Head<Paths> extends never // if there are no paths on the list
  ? Obj // use the Obj type
  : Tail<Paths> extends ReadonlyArray<string> // if there are more then one path
  ? ReplacePaths<
      ReplacePath<Obj, Head<Paths>, WrapperData>,
      Tail<Paths>,
      WrapperData
    > // recursive call with the updated object of all the previous paths, and the remaining paths
  : ReplacePath<Obj, Head<Paths>, WrapperData>; // return the final type when there is only one item left

// replace the type of a single path with the return type of SdkFnWrapperInternal
export type ReplacePath<
  Obj,
  Path extends string,
  WrapperData extends Record<string, any>
> = Path extends `${infer Head}.${infer Tail}`
  ? {
      [Key in keyof Obj]: Key extends Head
        ? ReplacePath<Obj[Key], Tail, WrapperData>
        : Obj[Key];
    } // if it's not the leaf key, recursive call with the nested path
  : {
      [Key in keyof Obj]: Key extends Path
        ? Obj[Key] extends SdkFn<ResponseData> // if the attribute type is an SDK function
          ? ReturnType<SdkFnWrapperInternal<Obj[Key], WrapperData>> // set to the return type of SdkFnWrapperInternal
          : Obj[Key]
        : Obj[Key];
    };

// helper type for SDK functions
export type SdkFn<T extends ResponseData> = (
  ...args: any
) => Promise<SdkResponse<T>>;

// should be used to type the wrapper functions
export type SdkFnWrapper<Z extends ResponseData> = <
  A extends any[],
  R extends ResponseData
>(
  fn: (...args: A) => Promise<SdkResponse<R>>
) => (
  ...args: A
) => Promise<SdkResponse<Z extends Record<string, never> ? R : Z & R>>;

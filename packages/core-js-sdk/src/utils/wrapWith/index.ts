/* eslint-disable import/exports-last */
import { ResponseData } from '../../sdk/types';
import { SdkFnWrapper, ReplacePaths, SdkFnsPaths } from './types';

/**
 * A wrapper function that allows to wrap multiple Sdk function
 * @param obj: The Sdk instance you want to wrap
 * @param paths: A readonly list of paths of the functions you want to wrap
 * @param wrapper: Your wrapper function, it should gets an Sdk function and return a new Sdk function
 * @returns a mutated instance of the Sdk with updated type definitions based on your wrapper return type
 *
 * Usage example:
 *
 * // Assuming this is our SDK instance
 * const sdk = {
 *    me: (token) => {...}
 *    flow: {
 *       start: (...params) => {...}
 *       next: (...params) => {...}
 *    }
 *    ...
 * }
 *
 * // This is our wrapper
 * const wrapper = (sdkFn) => async (...args) => {
 *    const sdkResponse = await sdkFn(...args)
 *
 *    // Modify return value
 *    return {...sdkResponse, data: {...sdkResponse.data, myCustomAttribute: 'hello'}}
 * }
 *
 * // And those are the paths we want to wrap
 * const paths = ['flow.start', 'flow.next'] as const // You MUST add as const!
 *
 * // We can wrap our SDK functions with the wrapper we created in this way
 * const newlyTypedSdk = wrapWith(sdk, paths, wrapper)
 *
 * Now the 2 wrapped functions will have the updated type based on the wrapper return value
 */

const wrapWith = <
  Obj extends object,
  Paths extends ReadonlyArray<SdkFnsPaths<Obj>>,
  WrapperData extends ResponseData
>(
  obj: Obj,
  paths: Paths,
  wrapper: SdkFnWrapper<WrapperData>
): ReplacePaths<Obj, Paths, WrapperData> => {
  paths.forEach((path) => {
    const sections = path.split('.');
    let section = sections.shift();
    let currentRef: Record<string, any> = obj;

    while (sections.length > 0) {
      currentRef = currentRef[section];

      if (!section || !currentRef) {
        throw Error(
          `Invalid path "${path}", "${section}" is missing or has no value`
        );
      }

      section = sections.shift();
    }

    if (typeof currentRef[section] !== 'function') {
      throw Error(`"${path}" is not a function`);
    }
    const origFn = currentRef[section];
    currentRef[section] = wrapper(origFn);
  });

  return obj as any;
};

export default wrapWith;

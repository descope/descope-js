import { InjectionKey } from 'vue';
import { Context } from './types';

export const DESCOPE_KEY = '$descope';

export const DESCOPE_INJECTION_KEY: InjectionKey<Context> = Symbol(DESCOPE_KEY);

declare const BUILD_VERSION: string;

export const baseHeaders = {
  'x-descope-sdk-name': 'vue',
  'x-descope-sdk-version': BUILD_VERSION,
};

export const IS_BROWSER = typeof window !== 'undefined';

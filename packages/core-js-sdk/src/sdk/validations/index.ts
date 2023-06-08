import { createOrValidator, createValidation } from './core';
import { Validator } from './types';
import {
  isEmail,
  isNotEmpty,
  isPhone,
  isString,
  isStringOrUndefined,
} from './validators';

/**
 *
 * Validate that all of the validators passes
 * @params each parameter is an array of validators, those validators will be verified against the wrapped function argument which in the same place
 * @throws if any of the validators fails, an error with the relevant message will be thrown
 */
export const withValidations =
  (...argsRules: Validator[][]) =>
  <T extends Array<any>, U>(fn: (...args: T) => U) =>
  (...args: T): U => {
    argsRules.forEach((rulesArr, i) =>
      createValidation(...rulesArr).validate(args[i])
    );

    return fn(...args);
  };

export const string = (fieldName: string) => [
  isString(`"${fieldName}" must be a string`),
];

export const isStringOrUndefinedValidator = (fieldName: string) => [
  isStringOrUndefined(`"${fieldName}" must be string or undefined`),
];

export const stringNonEmpty = (fieldName: string) => [
  isString(`"${fieldName}" must be a string`),
  isNotEmpty(`"${fieldName}" must not be empty`),
];
export const stringEmail = (fieldName: string) => [
  isString(`"${fieldName}" must be a string`),
  isEmail(),
];
export const stringPhone = (fieldName: string) => [
  isString(`"${fieldName}" must be a string`),
  isPhone(),
];

import get from 'lodash.get';
import { createValidation, createValidator } from './core';
import { Validator } from './types';

const regexMatch = (regex: RegExp) => (val: any) => regex.test(val);

const validateString = (val: any) => typeof val === 'string';
const validateStringOrUndefined = (val: any) =>
  val === undefined || typeof val === 'string';

const validateEmail = regexMatch(
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
);
const validatePhone = regexMatch(/^\+[1-9]{1}[0-9]{3,14}$/);
const validateMinLength = (min: number) => (val: any) => val.length >= min;
// const validatePlainObject = (val: any) => !!val && Object.getPrototypeOf(val) === Object.prototype;
const validatePathValue = (path: string, rules: Validator[]) => (val: any) =>
  createValidation(...rules).validate(get(val, path));

export const isEmail = createValidator(
  validateEmail,
  '"{val}" is not a valid email'
);
export const isPhone = createValidator(
  validatePhone,
  '"{val}" is not a valid phone number'
);
export const isNotEmpty = createValidator(
  validateMinLength(1),
  'Minimum length is 1'
);
export const isString = createValidator(
  validateString,
  'Input is not a string'
);

export const isOptionalString = createValidator(
  validateStringOrUndefined,
  'Input provided but its not a string'
);

// export const isPlainObject = createValidator(validatePlainObject, 'Input is not a plain object');
export const hasPathValue = (path: string, rules: Validator[]) =>
  createValidator(validatePathValue(path, rules))();

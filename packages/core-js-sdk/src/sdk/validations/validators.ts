import { createOrValidator, createValidation, createValidator } from './core';
import { Validator } from './types';

const regexMatch = (regex: RegExp) => (val: any) => regex.test(val);

const validateString = (val: any) => typeof val === 'string';

const validateUndefined = (val: any) => val === undefined;

const validateEmail = regexMatch(
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
);

// A replacement for lodash.get, because it may not integrate well in various runtime environments (Edge).
// Implementation is based on https://gist.github.com/dfkaye/59263b51cf1e0b633181c5f44ae2066a
const get = (object: any, pathName: string, defaultValue?: any) => {
  // Coerce pathName to a string (even it turns into "[object Object]").
  const path = Array.isArray(pathName) ? pathName.join('.') : String(pathName);

  // Support bracket notation, e.g., "a[0].b.c".
  const match = /\[\\?("|')?(\w|d)+\\?("|')?\]/g;

  const parts = path.replace(match, (m, i, v) => '.' + v).split('.');

  const length = parts.length;
  let i = 0;

  // In case object isn't a real object, set it to undefined.
  let value = object === Object(object) ? object : undefined;

  while (value != null && i < length) {
    value = value[parts[i++]];
  }

  /**
   * returns the resolved value if
   * 1. iteration happened (i > 0)
   * 2. iteration completed (i === length)
   * 3. the value at the path is found in the data structure (not undefined). Note that if the path is found but the
   *    value is null, then null is returned.
   * If any of those checks fails, return the defaultValue param, if provided.
   */
  return i && i === length && value !== undefined ? value : defaultValue;
};

const validatePhone = regexMatch(/^\+[1-9]{1}[0-9]{3,14}$/);
const validateMinLength = (min: number) => (val: any) => val.length >= min;
// const validatePlainObject = (val: any) => !!val && Object.getPrototypeOf(val) === Object.prototype;
const validatePathValue = (path: string, rules: Validator[]) => (val: any) =>
  createValidation(...rules).validate(get(val, path));

export const isEmail = createValidator(
  validateEmail,
  '"{val}" is not a valid email',
);
export const isPhone = createValidator(
  validatePhone,
  '"{val}" is not a valid phone number',
);
export const isNotEmpty = createValidator(
  validateMinLength(1),
  'Minimum length is 1',
);
export const isString = createValidator(
  validateString,
  'Input is not a string',
);

export const isUndefined = createValidator(
  validateUndefined,
  'Input is defined',
);

export const isStringOrUndefined = createOrValidator(
  [isString(), isUndefined()],
  'Input is not a string or undefined',
);

// export const isPlainObject = createValidator(validatePlainObject, 'Input is not a plain object');
export const hasPathValue = (path: string, rules: Validator[]) =>
  createValidator(validatePathValue(path, rules))();

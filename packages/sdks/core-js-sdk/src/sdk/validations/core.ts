import { Validator, ValidationRule, MakeValidator } from './types';

export const createValidator =
  (rule: ValidationRule, defaultMsg?: string): MakeValidator =>
  (msg = defaultMsg) =>
  (val) =>
    !rule(val) ? msg.replace('{val}', val) : false;

export const createOrValidator =
  (validators: Validator[], defaultMsg?: string): MakeValidator =>
  (msg = defaultMsg) =>
  (val) => {
    const errors = validators.filter((validator) => validator(val));

    if (errors.length < validators.length) return false;

    return msg ? msg.replace('{val}', val) : errors.join(' OR ');
  };

export const createValidation = (...validators: Validator[]) => ({
  validate: (val: any) => {
    validators.forEach((validator) => {
      const errMsg = validator(val);
      if (errMsg) throw new Error(errMsg);
    });

    return true;
  },
});

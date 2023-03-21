import {
  stringNonEmpty,
  withValidations,
  stringPhone,
  stringEmail,
} from '../validations';

export const loginIdValidations = stringNonEmpty('loginId');
export const withVerifyValidations = withValidations(stringNonEmpty('token'));
export const withSignValidations = withValidations(loginIdValidations);
export const withWaitForSessionValidations = withValidations(
  stringNonEmpty('pendingRef')
);
export const withUpdatePhoneValidations = withValidations(
  loginIdValidations,
  stringPhone('phone')
);
export const withUpdateEmailValidations = withValidations(
  loginIdValidations,
  stringEmail('email')
);

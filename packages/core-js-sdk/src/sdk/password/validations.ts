import { stringNonEmpty, withValidations } from '../validations';

const loginIdValidation = stringNonEmpty('loginId');
const newPasswordValidation = stringNonEmpty('newPassword');
export const withSignValidations = withValidations(
  loginIdValidation,
  stringNonEmpty('password')
);
export const withSendResetValidations = withValidations(loginIdValidation);
export const withUpdateValidation = withValidations(
  loginIdValidation,
  newPasswordValidation
);
export const withReplaceValidation = withValidations(
  loginIdValidation,
  stringNonEmpty('oldPassword'),
  newPasswordValidation
);

import {
  isStringOrUndefinedValidator,
  stringNonEmpty,
  withValidations,
} from '../validations';

const appIdValidation = stringNonEmpty('appId');
export const withConnectValidations = withValidations(appIdValidation);
export const withConnectFinishValidations = withValidations(
  stringNonEmpty('code'),
);

import {
  isStringOrUndefinedValidator,
  stringNonEmpty,
  withValidations,
} from '../validations';

const appIdValidation = stringNonEmpty('appId');
export const withConnectValidations = withValidations(appIdValidation);

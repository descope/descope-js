import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { transformResponse } from '../helpers';
import {
  SdkResponse,
  SignUpOptions,
} from '../types';
import {
  stringNonEmpty,
  withValidations,
} from '../validations';
import { NOTPResponse } from './types';

const loginIdValidations = stringNonEmpty('loginId');

const withSignValidations = withValidations(loginIdValidations);

const withNotp = (httpClient: HttpClient) => ({
  signUpOrIn: withSignValidations(
    (
      loginId: string,
      signUpOptions?: SignUpOptions,
    ): Promise<SdkResponse<NOTPResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.notp.signUpOrIn, {
          loginId,
          loginOptions: signUpOptions,
        }),
      ),
  ),
});

export default withNotp;

import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import { transformResponse } from './helpers';
import {
  AccessKeyLoginOptions,
  ExchangeAccessKeyResponse,
  SdkResponse,
} from './types';
import { stringNonEmpty, withValidations } from './validations';

const withExchangeValidations = withValidations(stringNonEmpty('accessKey'));

const withAccessKeys = (httpClient: HttpClient) => ({
  exchange: withExchangeValidations(
    (
      accessKey: string,
      loginOptions?: AccessKeyLoginOptions,
    ): Promise<SdkResponse<ExchangeAccessKeyResponse>> =>
      transformResponse(
        httpClient.post(
          apiPaths.accessKey.exchange,
          { loginOptions },
          { token: accessKey },
        ),
      ),
  ),
});

export default withAccessKeys;

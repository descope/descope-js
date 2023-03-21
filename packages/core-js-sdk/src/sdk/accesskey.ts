import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import { transformResponse } from './helpers';
import { ExchangeAccessKeyResponse, SdkResponse } from './types';
import { stringNonEmpty, withValidations } from './validations';

const withExchangeValidations = withValidations(stringNonEmpty('accessKey'));

const withAccessKeys = (httpClient: HttpClient) => ({
  exchange: withExchangeValidations(
    (accessKey: string): Promise<SdkResponse<ExchangeAccessKeyResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.accessKey.exchange, {}, { token: accessKey })
      )
  ),
});

export default withAccessKeys;

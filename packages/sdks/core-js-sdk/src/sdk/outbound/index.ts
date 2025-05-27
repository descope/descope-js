import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { transformResponse } from '../helpers';
import { ConnectOptions } from './types';
import { SdkResponse, URLResponse } from '../types';
import { withConnectValidations } from './validations';

const withOutbound = (httpClient: HttpClient) => ({
  connect: withConnectValidations(
    (
      appId: string,
      options?: ConnectOptions,
      token?: string,
    ): Promise<SdkResponse<URLResponse>> => {
      return transformResponse(
        httpClient.post(
          apiPaths.outbound.connect,
          {
            appId,
            options,
          },
          {
            token,
          },
        ),
      );
    },
  ),
});

export default withOutbound;

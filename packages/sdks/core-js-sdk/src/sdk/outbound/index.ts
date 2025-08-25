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
      const tenantId = options?.tenantId;
      const tenantLevel = options?.tenantLevel;
      delete options.tenantId;
      delete options.tenantLevel;
      return transformResponse(
        httpClient.post(
          apiPaths.outbound.connect,
          {
            appId,
            tenantId,
            tenantLevel,
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

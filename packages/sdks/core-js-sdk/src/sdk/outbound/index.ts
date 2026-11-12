import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { transformResponse } from '../helpers';
import { ConnectOptions } from './types';
import { SdkResponse, URLResponse } from '../types';
import {
  withConnectFinishValidations,
  withConnectValidations,
} from './validations';

const withOutbound = (httpClient: HttpClient) => ({
  connect: withConnectValidations(
    (
      appId: string,
      options?: ConnectOptions,
      token?: string,
    ): Promise<SdkResponse<URLResponse>> => {
      const tenantId = options?.tenantId;
      const tenantLevel = options?.tenantLevel;
      delete options?.tenantId;
      delete options?.tenantLevel;
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
  // Finishes a connect when the project stores the provider tokens only once the connect is finished.
  // code is the `code` query param on the redirect back to your application.
  connectFinish: withConnectFinishValidations(
    (code: string, tenantId?: string, token?: string) =>
      transformResponse<never>(
        httpClient.post(
          apiPaths.outbound.connectFinish,
          { code, tenantId },
          { token },
        ),
      ),
  ),
});

export default withOutbound;

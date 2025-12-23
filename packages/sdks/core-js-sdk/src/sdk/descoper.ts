import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import { transformResponse } from './helpers';
import {
  DescoperAttributes,
  DescoperCreate,
  DescoperCreateResponse,
  DescoperGetResponse,
  DescoperListResponse,
  DescoperListOptions,
  DescoperRBAC,
  DescoperUpdateResponse,
  SdkResponse,
} from './types';
import { stringNonEmpty, withValidations } from './validations';
import { isArray } from './validations/validators';

const withIdValidations = withValidations(stringNonEmpty('id'));
const withDescopersValidations = withValidations([
  isArray('"descopers" must be an array'),
]);

const withDescoper = (httpClient: HttpClient) => ({
  create: withDescopersValidations(
    (
      descopers: DescoperCreate[],
    ): Promise<SdkResponse<DescoperCreateResponse>> =>
      transformResponse(
        httpClient.put(apiPaths.descoper.create, { descopers }),
      ),
  ),

  update: withIdValidations(
    (
      id: string,
      attributes?: DescoperAttributes,
      rbac?: DescoperRBAC,
    ): Promise<SdkResponse<DescoperUpdateResponse>> =>
      transformResponse(
        httpClient.patch(apiPaths.descoper.update, { id, attributes, rbac }),
      ),
  ),

  get: withIdValidations(
    (id: string): Promise<SdkResponse<DescoperGetResponse>> =>
      transformResponse(
        httpClient.get(apiPaths.descoper.get, { queryParams: { id } }),
      ),
  ),

  delete: withIdValidations(
    (id: string): Promise<SdkResponse<Record<string, never>>> =>
      transformResponse(
        httpClient.delete(apiPaths.descoper.delete, { queryParams: { id } }),
      ),
  ),

  list: (
    options?: DescoperListOptions,
  ): Promise<SdkResponse<DescoperListResponse>> =>
    transformResponse(httpClient.post(apiPaths.descoper.list, { options })),
});

export default withDescoper;

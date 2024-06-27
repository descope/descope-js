import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { transformResponse } from '../helpers';
import { FlowResponse, Options, SdkResponse } from '../types';
import { stringNonEmpty, withValidations } from '../validations';
import { FlowInput } from './types';

const withStartValidations = withValidations(stringNonEmpty('flowId'));
const withNextValidations = withValidations(
  stringNonEmpty('executionId'),
  stringNonEmpty('stepId'),
  stringNonEmpty('interactionId'),
);

const withFlow = (httpClient: HttpClient) => ({
  start: withStartValidations(
    (
      flowId: string,
      options?: Options,
      conditionInteractionId?: string,
      interactionId?: string,
      version?: number,
      componentsVersion?: string,
      input?: FlowInput,
      baseUrl?: string,
    ): Promise<SdkResponse<FlowResponse>> =>
      transformResponse(
        httpClient.post(
          apiPaths.flow.start,
          {
            flowId,
            options,
            conditionInteractionId,
            interactionId,
            version,
            componentsVersion,
            input,
          },
          baseUrl ? { overrideBaseUrl: baseUrl } : undefined,
        ),
      ),
  ),
  next: withNextValidations(
    (
      executionId: string,
      stepId: string,
      interactionId: string,
      version?: number,
      componentsVersion?: string,
      input?: FlowInput,
    ): Promise<SdkResponse<FlowResponse>> => {
      return transformResponse(
        httpClient.post(apiPaths.flow.next, {
          executionId,
          stepId,
          interactionId,
          version,
          componentsVersion,
          input,
        }),
      );
    },
  ),
});

export default withFlow;

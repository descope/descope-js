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
      componentsVersion?: string,
      flowVersions?: Record<string, number>,
      input?: FlowInput,
      isCustomScreen = false,
    ): Promise<SdkResponse<FlowResponse>> =>
      transformResponse(
        httpClient.post(apiPaths.flow.start, {
          flowId,
          options,
          conditionInteractionId,
          interactionId,
          componentsVersion,
          flowVersions,
          input,
          isCustomScreen,
        }),
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
      isCustomScreen = false,
    ): Promise<SdkResponse<FlowResponse>> => {
      return transformResponse(
        httpClient.post(apiPaths.flow.next, {
          executionId,
          stepId,
          interactionId,
          version,
          componentsVersion,
          input,
          isCustomScreen,
        }),
      );
    },
  ),
});

export default withFlow;

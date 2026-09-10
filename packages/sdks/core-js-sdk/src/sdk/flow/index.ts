import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { transformResponse } from '../helpers';
import { FlowResponse, Options, SdkResponse } from '../types';
import { stringNonEmpty, withValidations } from '../validations';
import { FlowInput, FlowValidationEvent, NextOptions } from './types';

const withStartValidations = withValidations(stringNonEmpty('flowId'));
const withNextValidations = withValidations(
  stringNonEmpty('executionId'),
  stringNonEmpty('stepId'),
  stringNonEmpty('interactionId'),
);
const withEventValidations = withValidations(stringNonEmpty('executionId'));

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
      options?: NextOptions,
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
          options,
        }),
      );
    },
  ),
  /**
   * Report client-side form validation failures for a running flow. Best-effort
   * telemetry: the backend relays them to the project's connectors and persists
   * nothing. `keepalive` lets a final batch survive the page going away.
   */
  event: withEventValidations(
    (
      executionId: string,
      events: FlowValidationEvent[],
      keepalive?: boolean,
    ): Promise<SdkResponse<never>> =>
      transformResponse(
        httpClient.post(
          apiPaths.flow.event,
          { executionId, events },
          { keepalive },
        ),
      ),
  ),
});

export default withFlow;

import { apiPaths } from '../constants';
import { HttpClient } from '../httpClient';
import { transformResponse } from './helpers';
import { SdkResponse, EmailVerificationStartResponse } from './types';

const withEmailVerification = (httpClient: HttpClient) => ({
  /**
   * Starts a browser email verification and returns a single-use nonce
   * @returns The nonce to set on the email verification token input
   */
  start: (): Promise<SdkResponse<EmailVerificationStartResponse>> =>
    transformResponse(httpClient.post(apiPaths.emailVerification.start, {})),
});

export default withEmailVerification;

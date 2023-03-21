import { apiPaths } from '../../constants';
import { HttpClient } from '../../httpClient';
import { pathJoin, transformResponse } from '../helpers';
import {
  DeliveryMethods,
  DeliveryPhone,
  SdkResponse,
  JWTResponse,
  User,
  LoginOptions,
  MaskedAddress,
} from '../types';
import { MagicLink, Routes } from './types';
import {
  withSignValidations,
  withVerifyValidations,
  withUpdateEmailValidations,
  withUpdatePhoneValidations,
} from './validations';

const withMagicLink = (httpClient: HttpClient) => ({
  verify: withVerifyValidations(
    (token: string): Promise<SdkResponse<JWTResponse>> =>
      transformResponse(httpClient.post(apiPaths.magicLink.verify, { token }))
  ),

  signIn: Object.keys(DeliveryMethods).reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withSignValidations(
        (
          loginId: string,
          URI?: string,
          loginOptions?: LoginOptions,
          token?: string
        ): Promise<SdkResponse<MaskedAddress<typeof delivery>>> =>
          transformResponse(
            httpClient.post(
              pathJoin(apiPaths.magicLink.signIn, delivery),
              { loginId, URI, loginOptions },
              { token }
            )
          )
      ),
    }),
    {}
  ) as MagicLink[Routes.signIn],

  signUp: Object.keys(DeliveryMethods).reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withSignValidations(
        (
          loginId: string,
          URI?: string,
          user?: User
        ): Promise<SdkResponse<MaskedAddress<typeof delivery>>> =>
          transformResponse(
            httpClient.post(pathJoin(apiPaths.magicLink.signUp, delivery), {
              loginId,
              URI,
              user,
            })
          )
      ),
    }),
    {}
  ) as MagicLink[Routes.signUp],

  signUpOrIn: Object.keys(DeliveryMethods).reduce(
    (acc, delivery) => ({
      ...acc,
      [delivery]: withSignValidations(
        (
          loginId: string,
          URI?: string
        ): Promise<SdkResponse<MaskedAddress<typeof delivery>>> =>
          transformResponse(
            httpClient.post(pathJoin(apiPaths.magicLink.signUpOrIn, delivery), {
              loginId,
              URI,
            })
          )
      ),
    }),
    {}
  ) as MagicLink[Routes.signIn],

  update: {
    email: withUpdateEmailValidations(
      (
        loginId: string,
        email: string,
        URI?: string,
        token?: string
      ): Promise<SdkResponse<never>> =>
        transformResponse(
          httpClient.post(
            apiPaths.magicLink.update.email,
            { loginId, email, URI },
            { token }
          )
        )
    ),
    phone: Object.keys(DeliveryPhone).reduce(
      (acc, delivery) => ({
        ...acc,
        [delivery]: withUpdatePhoneValidations(
          (
            loginId: string,
            phone: string,
            URI?: string,
            token?: string
          ): Promise<SdkResponse<never>> =>
            transformResponse(
              httpClient.post(
                pathJoin(apiPaths.magicLink.update.phone, delivery),
                { loginId, phone, URI },
                { token }
              )
            )
        ),
      }),
      {}
    ) as MagicLink[Routes.updatePhone],
  },
});

export default withMagicLink;

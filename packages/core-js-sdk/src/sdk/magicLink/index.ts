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
  MaskedEmail,
  UpdateOptions,
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
        ) =>
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
        (loginId: string, URI?: string, user?: User) =>
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
      [delivery]: withSignValidations((loginId: string, URI?: string) =>
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
      <T extends boolean>(
        loginId: string,
        email: string,
        URI?: string,
        token?: string,
        updateOptions? : UpdateOptions<T>
      ): Promise<SdkResponse<MaskedEmail>> =>
        transformResponse(
          httpClient.post(
            apiPaths.magicLink.update.email,
            { loginId, email, URI, ...updateOptions },
            { token }
          )
        )
    ),
    phone: Object.keys(DeliveryPhone).reduce(
      (acc, delivery) => ({
        ...acc,
        [delivery]: withUpdatePhoneValidations(
          <T extends boolean>(
            loginId: string,
            phone: string,
            URI?: string,
            token?: string,
            updateOptions? : UpdateOptions<T>
          ) =>
            transformResponse(
              httpClient.post(
                pathJoin(apiPaths.magicLink.update.phone, delivery),
                { loginId, phone, URI, ...updateOptions },
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

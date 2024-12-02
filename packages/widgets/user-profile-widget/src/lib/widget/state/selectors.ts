import { createSelector } from 'reselect';
import { AttributeType, CustomAttr } from '../api/types';
import { State } from './types';

export const getMe = (state: State) => state.me.data;

export const getPicture = createSelector(getMe, (me) => me.picture);
export const getEmail = createSelector(getMe, (me) => me.email);
export const getIsEmailVerified = createSelector(
  getMe,
  (me) => me.verifiedEmail,
);
export const getName = createSelector(getMe, (me) => me.name);
export const getPhone = createSelector(getMe, (me) => me.phone);
export const getIsPhoneVerified = createSelector(
  getMe,
  (me) => me.verifiedPhone,
);
export const getHasPasskey = createSelector(getMe, (me) => me.webauthn);
export const getHasPassword = createSelector(getMe, (me) => me.password);

export const getCustomAttributes = (state: State) =>
  state.customAttributes.data;

export const getUserCustomAttrs = createSelector(
  getMe,
  getCustomAttributes,
  (
    userData: Record<string, any>,
    allCustomAttrs: CustomAttr[] = [],
  ): Record<string, string> => {
    const userCustomAttributes = userData['customAttributes'] || {};

    return Object.entries(userCustomAttributes).reduce(
      (acc, [key]) => {
        const type =
          allCustomAttrs.find((attr) => attr.name === key)?.type ||
          AttributeType.text;

        if (type === AttributeType.date && userCustomAttributes[key]) {
          // to full date time
          acc[key] = new Date(userCustomAttributes[key]).toLocaleString();
        } else if (
          type === AttributeType.boolean &&
          userCustomAttributes[key] !== undefined
        ) {
          acc[key] = !userCustomAttributes[key] ? 'False' : 'True';
        } else {
          acc[key] = (userCustomAttributes[key] || '').toString();
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  },
);

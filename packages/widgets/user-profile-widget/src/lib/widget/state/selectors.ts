import { createSelector } from 'reselect';
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
export const getHasTotp = createSelector(getMe, (me) => me.TOTP);

export const getUserCustomAttrs = createSelector(
  getMe,
  (me) => me.customAttributes as Record<string, any>,
);

export const getUserBuiltinAttrs = createSelector(getMe, (me) => ({
  givenName: me.givenName,
  middleName: me.middleName,
  familyName: me.familyName,
}));

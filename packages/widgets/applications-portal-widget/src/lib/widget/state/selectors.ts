import { createSelector } from 'reselect';
import { State } from './types';
import { SSOAppType } from '../api/types';

export const getSSOAppsList = (state: State) => state.ssoAppsList.data;
export const getSamlApps = createSelector(getSSOAppsList, (ssoAppsList) =>
  ssoAppsList?.filter?.((app) => app.appType === SSOAppType.saml));

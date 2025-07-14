import { createSelector } from 'reselect';
import { State } from './types';

export const getOutboundAppsList = (state: State) =>
  state.outboundAppsList.data;

export const connectedOutboundAppsList = (state: State) =>
  state.connectedOutboundAppsIds.data;

export const getConnectedAppsList = createSelector(
  connectedOutboundAppsList,
  (connectedIds) => {
    return connectedIds;
  },
);

export const getAppsList = createSelector(
  getOutboundAppsList,
  connectedOutboundAppsList,
  (obApps, connectedIds) =>
    obApps.map((app) => ({
      name: app.name,
      description: app.description,
      logo: app.logo,
    })),
);

// export const getConnectedAppsList = createSelector(
//   getConnectedAppsList,
//   (obApps) => obApps,
// );

export const getMe = (state: State) => state.me.data;

export const getUserId = createSelector(getMe, (me) => me.userId);

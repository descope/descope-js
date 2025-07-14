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

export const getMappedAppsList = createSelector(
  getOutboundAppsList,
  connectedOutboundAppsList,
  (obApps, connectedIds) =>
    obApps.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      logo: app.logo,
      isConnected: connectedIds.includes(app.id),
    })),
);

export const getAppsList = createSelector(getMappedAppsList, (obApps) =>
  obApps.map((app) => ({
    appId: app.id,
    name: app.name,
    description: app.description,
    logo: app.logo,
    isConnected: app.isConnected,
  })),
);

export const getMe = (state: State) => state.me.data;

export const getUserId = createSelector(getMe, (me) => me.userId);

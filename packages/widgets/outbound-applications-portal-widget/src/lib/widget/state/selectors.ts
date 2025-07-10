import { createSelector } from 'reselect';
import { State } from './types';

export const getOutboundAppsList = (state: State) =>
  state.outboundAppsList.data;

export const getConnectedOutboundAppsList = (state: State) =>
  state.connectedOutboundAppsIds.data;

export const getAppsList = createSelector(getOutboundAppsList, (obApps) =>
  obApps.map((app) => ({
    name: app.name,
    icon: app.logo,
    // url: app.url,
  })),
);

export const getConnectedAppsList = createSelector(
  getConnectedOutboundAppsList,
  (obApps) => obApps,
);

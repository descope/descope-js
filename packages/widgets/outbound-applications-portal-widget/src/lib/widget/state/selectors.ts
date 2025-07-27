import { createSelector } from 'reselect';
import { State } from './types';

export const getOutboundAppsList = (state: State) =>
  state.outboundAppsList.data;

export const getConnectedOutboundAppsList = (state: State) =>
  state.connectedOutboundAppsIds.data;

export const allowedAppsIds = (state: State) => state.allowedAppsIds.data;

export const getAppsList = createSelector(
  getOutboundAppsList,
  getConnectedOutboundAppsList,
  allowedAppsIds,
  (obApps, connectedIds, allowedIds) =>
    obApps
      .filter((app) => allowedIds.length === 0 || allowedIds.includes(app.id))
      .map((app) => ({
        appId: app.id,
        name: app.name,
        description: app.description,
        logo: app.logo,
        isConnected: connectedIds.includes(app.id),
      })),
);

export const getMe = (state: State) => state.me.data;

export const getUserId = createSelector(getMe, (me) => me.userId);

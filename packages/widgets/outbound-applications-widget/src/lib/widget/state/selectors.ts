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
      .filter((app) => allowedIds === undefined || allowedIds.includes(app.id))
      .map((app) => {
        const isConnected = connectedIds.includes(app.id);
        return {
          ...app,
          appId: app.id,
          isConnected,
        };
      }),
);

export const getMe = (state: State) => state.me.data;

export const getUserId = createSelector(getMe, (me) => me.userId);

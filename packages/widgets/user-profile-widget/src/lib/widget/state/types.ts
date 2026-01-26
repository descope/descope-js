import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { Sdk } from '../api/sdk';

type Device = {
  id: string;
  name: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  isCurrentDevice: boolean;
  lastLoginTime: string;
};

export type State = {
  me: {
    loading: boolean;
    error: unknown;
    data: Record<string, any>;
  };
  devices: {
    loading: boolean;
    error: unknown;
    data: Device[];
  };
  tenant: {
    currentTenantId: string | null;
  };
  notifications: Notification[];
};

type First<T extends any[]> = T extends [infer U, ...any[]] ? U : never;

export type FirstParameter<T extends (...args: any[]) => any> = First<
  Parameters<T>
>;

export type ThunkConfigExtraApi = { extra: { api: Sdk } };

export type RemoveVoid<T> = T extends void ? never : T;

export type Builder = ActionReducerMapBuilder<State>;

type Notification = {
  type: 'success' | 'error';
  msg: string;
};

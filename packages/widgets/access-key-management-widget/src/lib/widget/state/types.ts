import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { ToastNotification } from '@descope/sdk-mixins';
import { Sdk } from '../api/sdk';
import { AccessKey, Role, SortParams } from '../api/types';

export type State = {
  accessKeysList: {
    data: AccessKey[];
    loading: boolean;
    error: unknown;
  };
  createAccessKey: {
    loading: boolean;
    error: unknown;
  };
  activateAccessKey: {
    loading: boolean;
    error: unknown;
  };
  deactivateAccessKey: {
    loading: boolean;
    error: unknown;
  };
  deleteAccessKey: {
    loading: boolean;
    error: unknown;
  };
  tenantRoles: {
    loading: boolean;
    error: unknown;
    data: Role[];
  };
  searchParams: { text: string; sort: SortParams[] };
  selectedAccessKeysIds: string[];
  notifications: ToastNotification[];
};

type First<T extends any[]> = T extends [infer U, ...any[]] ? U : never;

export type FirstParameter<T extends (...args: any[]) => any> = First<
  Parameters<T>
>;

export type ThunkConfigExtraApi = { extra: { api: Sdk } };

export type RemoveVoid<T> = T extends void ? never : T;

export type Builder = ActionReducerMapBuilder<State>;

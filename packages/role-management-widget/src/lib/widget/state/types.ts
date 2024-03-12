import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { Sdk } from '../api/sdk';
import { Role, Permission, SortParams } from '../api/types';

export type State = {
  rolesList: {
    data: Role[];
    loading: boolean;
    error: unknown;
  };
  createRole: {
    loading: boolean;
    error: unknown;
  };
  updateRole: {
    loading: boolean;
    error: unknown;
  };
  deleteRole: {
    loading: boolean;
    error: unknown;
  };
  tenantPermissions: {
    loading: boolean;
    error: unknown;
    data: Permission[];
  };
  searchParams: { text: string; sort: SortParams[] };
  selectedRolesIds: string[];
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

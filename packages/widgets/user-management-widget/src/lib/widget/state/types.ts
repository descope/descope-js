import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { Sdk } from '../api/sdk';
import { CustomAttr, Role, SortParams, User } from '../api/types';

export type State = {
  usersList: {
    data: User[];
    loading: boolean;
    error: unknown;
  };
  createUser: {
    loading: boolean;
    error: unknown;
  };
  updateUser: {
    loading: boolean;
    error: unknown;
  };
  deleteUser: {
    loading: boolean;
    error: unknown;
  };
  enableUser: {
    loading: boolean;
    error: unknown;
  };
  disableUser: {
    loading: boolean;
    error: unknown;
  };
  removePasskey: {
    loading: boolean;
    error: unknown;
  };
  setTempUserPassword: {
    loading: boolean;
    error: unknown;
  };
  customAttributes: {
    loading: boolean;
    error: unknown;
    data: CustomAttr[];
  };
  tenantRoles: {
    loading: boolean;
    error: unknown;
    data: Role[];
  };
  searchParams: { text: string; sort: SortParams[] };
  selectedUsersLoginIds: string[][];
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

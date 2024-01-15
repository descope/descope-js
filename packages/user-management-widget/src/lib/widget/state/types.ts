import { Api } from '../apiMixin/api';
import { User } from '../apiMixin/types';

export type State = {
  usersList: {
    data: User[]
    loading: boolean,
    error: unknown
  },
  createUser: {
    loading: boolean,
    error: unknown
  },
  deleteUser: {
    loading: boolean,
    error: unknown
  },
  expireUserPassword: {
    loading: boolean,
    error: unknown
  },
  filter: string,
  selectedUsersIds: string[][]
}

type First<T extends any[]> = T extends [infer U, ...any[]] ? U : never;

export type FirstParameter<T extends (...args: any[]) => any> = First<Parameters<T>>;

export type ThunkConfigExtraApi = { extra: { api: Api } }

export type RemoveVoid<T> = T extends void ? never : T;

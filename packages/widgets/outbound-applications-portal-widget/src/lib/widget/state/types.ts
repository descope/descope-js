import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { Sdk } from '../api/sdk';
import { OutboundApplication } from '../api/types';

export type State = {
  outboundAppsList: {
    data: OutboundApplication[];
    loading: boolean;
    error: unknown;
  };
  connectedOutboundAppsIds: {
    data: string[];
    loading: boolean;
    error: unknown;
  };
  me: {
    loading: boolean;
    error: unknown;
    data: Record<string, any>;
  };
};

type First<T extends any[]> = T extends [infer U, ...any[]] ? U : never;

export type FirstParameter<T extends (...args: any[]) => any> = First<
  Parameters<T>
>;

export type ThunkConfigExtraApi = { extra: { api: Sdk } };

export type RemoveVoid<T> = T extends void ? never : T;

export type Builder = ActionReducerMapBuilder<State>;

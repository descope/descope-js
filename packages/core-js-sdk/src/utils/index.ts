import { SdkConfig } from '../types';

export { default as wrapWith } from './wrapWith';
export type { SdkFnWrapper } from './wrapWith/types';

/**
 * Add hooks to an existing core-sdk config
 */
export const addHooksToConfig = <Config extends SdkConfig>(
  config: Config,
  hooks: Config['hooks']
): Config => {
  ['beforeRequest', 'afterRequest'].reduce((acc, key) => {
    acc[key] = [].concat(config.hooks?.[key] || []).concat(hooks?.[key] || []);

    return acc;
  }, (config.hooks ??= {}));

  return config;
};

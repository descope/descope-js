import type { CSPDirectives, CSPResult, DescopeCSPOptions } from './types';
import { getDescopeDefaults } from './defaults';
import { mergeCSPDirectives } from './merge';
import { serializeCSP } from './serialize';

export const createDescopeCSP = (options?: DescopeCSPOptions): CSPResult => {
  const basePolicy = getDescopeDefaults(options?.urls, options?.nonce);

  const policies: CSPDirectives[] = [basePolicy];

  if (options?.presets) {
    policies.push(...options.presets);
  }

  if (options?.extend) {
    policies.push(options.extend);
  }

  const mergedDirectives = mergeCSPDirectives(...policies);

  return {
    directives: mergedDirectives,
    toString: () => serializeCSP(mergedDirectives),
  };
};

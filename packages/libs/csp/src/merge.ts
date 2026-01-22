import type { CSPDirectives, CSPDirectiveName } from './types';

export const mergeCSPDirectives = (
  ...policies: CSPDirectives[]
): CSPDirectives => {
  const merged: CSPDirectives = {};

  for (const policy of policies) {
    for (const [directive, sources] of Object.entries(policy)) {
      if (!sources || sources.length === 0) continue;

      const directiveName = directive as CSPDirectiveName;

      if (!merged[directiveName]) {
        merged[directiveName] = [];
      }

      for (const source of sources) {
        if (!merged[directiveName]!.includes(source)) {
          merged[directiveName]!.push(source);
        }
      }
    }
  }

  return merged;
};

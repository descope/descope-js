import type { CSPDirectives } from './types';

export const serializeCSP = (directives: CSPDirectives): string => {
  return Object.entries(directives)
    .filter(([, sources]) => sources && sources.length > 0)
    .map(([directive, sources]) => `${directive} ${sources!.join(' ')}`)
    .join('; ');
};

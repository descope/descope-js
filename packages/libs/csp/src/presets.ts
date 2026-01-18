import type { CSPPreset } from './types';

export const googleFonts: CSPPreset = {
  'style-src': ['https://fonts.googleapis.com'],
  'font-src': ['https://fonts.gstatic.com'],
};

export const segment: CSPPreset = {
  'script-src': ['https://cdn.segment.com'],
  'connect-src': ['https://api.segment.io', 'https://cdn.segment.com'],
};

export const presets = {
  googleFonts,
  segment,
};

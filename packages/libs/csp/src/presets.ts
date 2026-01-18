import type { CSPPreset } from './types';

export const googleFonts: CSPPreset = {
  'style-src': ['https://fonts.googleapis.com'],
  'font-src': ['https://fonts.gstatic.com'],
};

export const segment: CSPPreset = {
  'script-src': ['https://cdn.segment.com'],
  'connect-src': ['https://api.segment.io', 'https://cdn.segment.com'],
};

export const featureOS: CSPPreset = {
  'script-src': ['https://widgets-v3.featureos.app'],
  'frame-src': ['https://widgets-v3.featureos.app'],
};

export const devRev: CSPPreset = {
  'script-src': ['https://plug-platform.devrev.ai'],
  'connect-src': ['https://plug-platform.devrev.ai', 'https://api.devrev.ai'],
  'frame-src': ['https://plug-platform.devrev.ai'],
};

export const jsdelivr: CSPPreset = {
  'script-src': ['https://cdn.jsdelivr.net'],
  'connect-src': ['https://cdn.jsdelivr.net'],
};

export const npmRegistry: CSPPreset = {
  'connect-src': ['https://registry.npmjs.org/@descope/flow-components'],
};

export const descopeInternal: CSPPreset = {
  'script-src': ['https://dev-panel.preview.descope.org'],
  'style-src': ['https://static.descope.org', 'https://imgs.descope.com'],
  'img-src': ['https://imgs.descope.com', 'https://static.descope.com'],
  'font-src': ['https://descopecdn.com'],
  'connect-src': ['https://descopecdn.com', 'https://imgs.descope.com'],
};

export const presets = {
  googleFonts,
  segment,
  featureOS,
  devRev,
  jsdelivr,
  npmRegistry,
  descopeInternal,
};

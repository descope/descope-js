import { environment } from '../../environment';

export const baseHeaders = {
  'x-descope-sdk-name': 'angular',
  'x-descope-sdk-version': environment.buildVersion
};

// Detect if running in a native flow (e.g., mobile app with Descope bridge in a webview)
export const isDescopeBridge = () => !!(window as any)?.descopeBridge;

export const isBrowser = () => typeof window !== 'undefined';

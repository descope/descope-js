import { environment } from '../../environment';

export const baseHeaders = {
  'x-descope-sdk-name': 'angular',
  'x-descope-sdk-version': environment.buildVersion
};

export const isBrowser = () => typeof window !== 'undefined';

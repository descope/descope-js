import DescopeWc from './DescopeWc';

if (!customElements.get('descope-wc')) {
  customElements.define('descope-wc', DescopeWc);
} else {
  // eslint-disable-next-line no-console
  console.log('descope-wc is already defined');
}
export default DescopeWc;

export type ILogger = Partial<DescopeWc['logger']>;

export type { AutoFocusOptions, ThemeOptions, CustomStorage } from '../types';

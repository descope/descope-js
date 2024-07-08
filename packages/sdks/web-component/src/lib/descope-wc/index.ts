import DescopeWc from './DescopeWc';

if (!customElements.get('descope-wc')) {
  customElements.define('descope-wc', DescopeWc);
} else {
  // eslint-disable-next-line no-console
  console.log('descope-wc is already defined');
}
export default DescopeWc;

export type { AutoFocusOptions, ThemeOptions, ILogger } from '../types';

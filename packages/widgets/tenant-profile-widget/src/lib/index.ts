// eslint-disable-next-line @typescript-eslint/no-unused-vars
import '@descope/web-component';
import { TenantProfileWidget } from './widget';

declare global {
  interface HTMLElement {
    attributeChangedCallback(
      attrName: string,
      oldValue: string | null,
      newValue: string | null,
    ): void;
    connectedCallback(): void;
  }
}

export default TenantProfileWidget;

customElements.define('descope-tenant-profile-widget', TenantProfileWidget);

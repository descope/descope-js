// eslint-disable-next-line @typescript-eslint/no-unused-vars
import '@descope/web-component';
import { TenantAdminWidget } from './widget';

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

export default TenantAdminWidget;

customElements.define('descope-tenant-admin-widget', TenantAdminWidget);

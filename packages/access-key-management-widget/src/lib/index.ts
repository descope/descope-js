import { AccessKeyManagementWidget } from './widget';

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

export default AccessKeyManagementWidget;

customElements.define(
  'descope-access-key-management-widget',
  AccessKeyManagementWidget,
);

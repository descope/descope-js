import { RoleManagementWidget } from './widget';

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

export default RoleManagementWidget;

customElements.define('descope-role-management-widget', RoleManagementWidget);

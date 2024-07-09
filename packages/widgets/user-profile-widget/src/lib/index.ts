// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Unsubscribe } from 'redux'; //  workaround for https://github.com/microsoft/TypeScript/issues/42873
import { UserProfileWidget } from './widget';
import '@descope/web-component';

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

export default UserProfileWidget;

customElements.define('descope-user-profile-widget', UserProfileWidget);

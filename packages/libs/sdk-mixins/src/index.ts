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

export * from './mixins/configMixin';
export * from './mixins/createValidateAttributesMixin';
export * from './mixins/debuggerMixin';
export * from './mixins/descopeUiMixin';
export * from './mixins/loggerMixin';
export * from './mixins/modalMixin';
export * from './mixins/notificationsMixin';
export * from './mixins/observeAttributesMixin';
export * from './mixins/staticResourcesMixin';
export * from './mixins/themeMixin';
export * from './mixins/createStateManagementMixin';
export * from './mixins/formMixin';
export * from './mixins/initElementMixin';
export * from './mixins/initLifecycleMixin';
export * from './mixins/projectIdMixin';
export * from './mixins/baseUrlMixin';

import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import {
  descopeUiMixin,
  initElementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import { fetchWidgetPagesMixin } from '../../fetchWidgetPagesMixin';
import { stateManagementMixin } from '../../stateManagementMixin';

export const initWidgetRootMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitWidgetRootMixinClass extends compose(
      loggerMixin,
      initLifecycleMixin,
      descopeUiMixin,
      initElementMixin,
      fetchWidgetPagesMixin,
      stateManagementMixin,
    )(superclass) {
      async #initWidgetRoot() {
        const template = createTemplate(
          `
          <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="1rem" st-vertical-padding="1rem" st-align-items="safe center" st-justify-content="safe center" st-host-width="100%" st-gap="1rem">
            <descope-container data-editor-type="container" direction="row" id="headerContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="space-between" st-host-width="100%" st-gap="0rem">
              <descope-avatar flow-id="update-pic" editable="true" bordered="true" data-id="avatar" data-testid="avatar" size="lg"/>
            </descope-container>
            <descope-container data-editor-type="container" st-gap="32px" direction="column" id="headerContainer" st-horizontal-padding="0rem" st-vertical-padding="1rem" st-align-items="start" st-justify-content="space-between" st-host-width="100%" st-gap="0rem">
              <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">Personal Information</descope-text>
              <descope-user-attribute edit-flow-id="test-widget" delete-flow-id="test-widget" data-id="email" placeholder="Add an email" full-width="true" label="Email"></descope-user-attribute>
              <descope-user-attribute edit-flow-id="test-widget" delete-flow-id="test-widget" data-id="name" full-width="true" label="Name" value="Nir Gur Arie"></descope-user-attribute>
              <descope-user-attribute edit-flow-id="test-widget" delete-flow-id="test-widget" data-id="phone" placeholder="Add a phone number" full-width="true" label="Phone"></descope-user-attribute>
            </descope-container>
            <descope-divider></descope-divider>
            <descope-container data-editor-type="container" st-gap="32px" direction="column" id="headerContainer" st-horizontal-padding="0rem" st-vertical-padding="1rem" st-align-items="start" st-justify-content="space-between" st-host-width="100%" st-gap="0rem">
              <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">Authentication Methods</descope-text>
              <descope-user-auth-method flow-id="test-widget" data-id="passkey" button-label="Add" full-width="true" label="Passkey">
                <svg slot="button-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.2181 5.2181H1.22305C0.791359 5.2181 0.441406 5.56805 0.441406 5.99974C0.441406 6.43143 0.791359 6.78138 1.22305 6.78138H5.2181V10.7764C5.2181 11.2081 5.56805 11.5581 5.99974 11.5581C6.43143 11.5581 6.78138 11.2081 6.78138 10.7764V6.78138H10.7764C11.2081 6.78138 11.5581 6.43143 11.5581 5.99974C11.5581 5.56805 11.2081 5.2181 10.7764 5.2181H6.78138V1.22305C6.78138 0.791359 6.43143 0.441406 5.99974 0.441406C5.56805 0.441406 5.2181 0.791359 5.2181 1.22305V5.2181Z" fill="#006AF5"/>
                </svg>
                <svg slot="method-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.8093 4.47C17.7293 4.47 17.6493 4.45 17.5793 4.41C15.6593 3.42 13.9993 3 12.0093 3C10.0293 3 8.14925 3.47 6.43925 4.41C6.19925 4.54 5.89925 4.45 5.75925 4.21C5.62925 3.97 5.71925 3.66 5.95925 3.53C7.81925 2.52 9.85925 2 12.0093 2C14.1393 2 15.9993 2.47 18.0393 3.52C18.2893 3.65 18.3793 3.95 18.2493 4.19C18.1593 4.37 17.9893 4.47 17.8093 4.47ZM3.49925 9.72C3.39925 9.72 3.29925 9.69 3.20925 9.63C2.97925 9.47 2.92925 9.16 3.08925 8.93C4.07925 7.53 5.33925 6.43 6.83925 5.66C9.97925 4.04 13.9993 4.03 17.1493 5.65C18.6493 6.42 19.9093 7.51 20.8993 8.9C21.0593 9.12 21.0093 9.44 20.7793 9.6C20.5493 9.76 20.2393 9.71 20.0793 9.48C19.1793 8.22 18.0393 7.23 16.6893 6.54C13.8193 5.07 10.1493 5.07 7.28925 6.55C5.92925 7.25 4.78925 8.25 3.88925 9.51C3.80925 9.65 3.65925 9.72 3.49925 9.72ZM9.74925 21.79C9.61925 21.79 9.48925 21.74 9.39925 21.64C8.52925 20.77 8.05925 20.21 7.38925 19C6.69925 17.77 6.33925 16.27 6.33925 14.66C6.33925 11.69 8.87925 9.27 11.9993 9.27C15.1193 9.27 17.6593 11.69 17.6593 14.66C17.6593 14.94 17.4393 15.16 17.1593 15.16C16.8793 15.16 16.6593 14.94 16.6593 14.66C16.6593 12.24 14.5693 10.27 11.9993 10.27C9.42925 10.27 7.33925 12.24 7.33925 14.66C7.33925 16.1 7.65925 17.43 8.26925 18.51C8.90925 19.66 9.34925 20.15 10.1193 20.93C10.3093 21.13 10.3093 21.44 10.1193 21.64C10.0093 21.74 9.87925 21.79 9.74925 21.79ZM16.9193 19.94C15.7293 19.94 14.6793 19.64 13.8193 19.05C12.3293 18.04 11.4393 16.4 11.4393 14.66C11.4393 14.38 11.6593 14.16 11.9393 14.16C12.2193 14.16 12.4393 14.38 12.4393 14.66C12.4393 16.07 13.1593 17.4 14.3793 18.22C15.0893 18.7 15.9193 18.93 16.9193 18.93C17.1593 18.93 17.5593 18.9 17.9593 18.83C18.2293 18.78 18.4893 18.96 18.5393 19.24C18.5893 19.51 18.4093 19.77 18.1293 19.82C17.5593 19.93 17.0593 19.94 16.9193 19.94ZM14.9093 22C14.8693 22 14.8193 21.99 14.7793 21.98C13.1893 21.54 12.1493 20.95 11.0593 19.88C9.65925 18.49 8.88925 16.64 8.88925 14.66C8.88925 13.04 10.2693 11.72 11.9693 11.72C13.6693 11.72 15.0493 13.04 15.0493 14.66C15.0493 15.73 15.9793 16.6 17.1293 16.6C18.2793 16.6 19.2093 15.73 19.2093 14.66C19.2093 10.89 15.9593 7.83 11.9593 7.83C9.11925 7.83 6.51925 9.41 5.34925 11.86C4.95925 12.67 4.75925 13.62 4.75925 14.66C4.75925 15.44 4.82925 16.67 5.42925 18.27C5.52925 18.53 5.39925 18.82 5.13925 18.91C4.87925 19.01 4.58925 18.87 4.49925 18.62C4.00925 17.31 3.76925 16.01 3.76925 14.66C3.76925 13.46 3.99925 12.37 4.44925 11.42C5.77925 8.63 8.72925 6.82 11.9593 6.82C16.5093 6.82 20.2093 10.33 20.2093 14.65C20.2093 16.27 18.8293 17.59 17.1293 17.59C15.4293 17.59 14.0493 16.27 14.0493 14.65C14.0493 13.58 13.1193 12.71 11.9693 12.71C10.8193 12.71 9.88925 13.58 9.88925 14.65C9.88925 16.36 10.5493 17.96 11.7593 19.16C12.7093 20.1 13.6193 20.62 15.0293 21.01C15.2993 21.08 15.4493 21.36 15.3793 21.62C15.3293 21.85 15.1193 22 14.9093 22Z" fill="#808080"/>
                </svg>
              </descope-user-auth-method>
              <descope-user-auth-method flow-id="test-widget" data-id="password" button-label="Reset password" full-width="true" label="Password">
                <svg slot="button-icon" width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.00065 8.83398C2.00065 7.45898 2.55898 6.20898 3.46732 5.30065L2.28398 4.11732C1.08398 5.32565 0.333984 6.99232 0.333984 8.83398C0.333984 12.234 2.87565 15.034 6.16732 15.4423V13.759C3.80898 13.359 2.00065 11.309 2.00065 8.83398ZM13.6673 8.83398C13.6673 5.15065 10.684 2.16732 7.00065 2.16732C6.95065 2.16732 6.90065 2.17565 6.85065 2.17565L7.75898 1.26732L6.58398 0.0839844L3.66732 3.00065L6.58398 5.91732L7.75898 4.74232L6.85898 3.84232C6.90898 3.84232 6.95898 3.83398 7.00065 3.83398C9.75898 3.83398 12.0007 6.07565 12.0007 8.83398C12.0007 11.309 10.1923 13.359 7.83398 13.759V15.4423C11.1257 15.034 13.6673 12.234 13.6673 8.83398Z" fill="#006AF5"/>
                </svg>
                <svg slot="method-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 17H22V19H2V17ZM3.15 12.95L4 11.47L4.85 12.95L6.15 12.2L5.3 10.72H7V9.22H5.3L6.15 7.75L4.85 7L4 8.47L3.15 7L1.85 7.75L2.7 9.22H1V10.72H2.7L1.85 12.2L3.15 12.95ZM9.85 12.2L11.15 12.95L12 11.47L12.85 12.95L14.15 12.2L13.3 10.72H15V9.22H13.3L14.15 7.75L12.85 7L12 8.47L11.15 7L9.85 7.75L10.7 9.22H9V10.72H10.7L9.85 12.2ZM23 9.22H21.3L22.15 7.75L20.85 7L20 8.47L19.15 7L17.85 7.75L18.7 9.22H17V10.72H18.7L17.85 12.2L19.15 12.95L20 11.47L20.85 12.95L22.15 12.2L21.3 10.72H23V9.22Z" fill="#808080"/>
                </svg>
              </descope-user-auth-method>
          </descope-container>
          <descope-divider></descope-divider>
          <descope-container data-editor-type="container" st-gap="32px" direction="column" id="headerContainer" st-horizontal-padding="0rem" st-vertical-padding="1rem" st-align-items="start" st-justify-content="space-between" st-host-width="100%" st-gap="0rem">
            <descope-button data-id="logout" data-type="button" formNoValidate="false" full-width="false" size="lg" variant="link" mode="error" square="false">Logout</descope-button>
          </descope-container>
        </descope-container>
`,
          // await this.fetchWidgetPage('root.html'),
        );
        await this.loadDescopeUiComponents(template);
        this.contentRootElement.append(template.content.cloneNode(true));
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async onWidgetRootReady() {}

      async init() {
        await super.init?.();

        await Promise.all([this.#initWidgetRoot(), this.actions.getMe()]);

        this.onWidgetRootReady();
      }
    },
);

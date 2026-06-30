import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import {
  createFetchWidgetPagesMixin,
  descopeUiMixin,
  initElementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';

const WIDGET_PAGES_BASE_DIR = 'user-profile-widget';

export const initWidgetRootMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitWidgetRootMixinClass extends compose(
      loggerMixin,
      initLifecycleMixin,
      descopeUiMixin,
      initElementMixin,
      createFetchWidgetPagesMixin(WIDGET_PAGES_BASE_DIR),
      stateManagementMixin,
    )(superclass) {
      async #initWidgetRoot() {
        const template = createTemplate(
          // await import('../../../../../../test/mocks/rootMock').then(module => module.default)
          await this.fetchWidgetPage('root.html'),
        );

        await this.loadDescopeUiComponents(template);
        this.contentRootElement.append(template.content.cloneNode(true));
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async onWidgetRootReady() {}

      async init() {
        await super.init?.();
        try {
          await this.actions.getMe();
          await this.#initWidgetRoot();
          await this.onWidgetRootReady();
        } catch (err: unknown) {
          // Surface fatal init errors via the standard `error` CustomEvent.
          // Host pages and the native bridge both listen on the widget element.
          const code = (err as { code?: string })?.code;
          const message =
            (err as { message?: string })?.message ||
            (typeof err === 'string' ? err : 'Widget failed to initialize');
          this.dispatchEvent(
            new CustomEvent('error', {
              detail: {
                code,
                description: 'Widget failed to initialize',
                message,
              },
            }),
          );
          throw err;
        }
        this.dispatchEvent(new CustomEvent('ready'));
      }
    },
);

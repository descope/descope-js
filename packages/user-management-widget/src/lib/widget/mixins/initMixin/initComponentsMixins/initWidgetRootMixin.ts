import { compose } from '../../../../helpers/compose';
import { createTemplate } from '../../../../helpers/dom';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { descopeUiMixin } from '../../../../mixins/descopeUiMixin/descopeUiMixin';
import { initElementMixin } from '../../../../mixins/initElementMixin';
import { initLifecycleMixin } from '../../../../mixins/initLifecycleMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import widgetTemplate from '../../../mockTemplates/widgetTemplate';

export const initWidgetRootMixin = createSingletonMixin(<T extends CustomElementConstructor>(superclass: T) =>
  class InitWidgetRootMixinClass extends compose(loggerMixin, initLifecycleMixin, descopeUiMixin, initElementMixin)(superclass) {

    async #initWidgetRoot() {
      const template = createTemplate(widgetTemplate);
      await this.loadDescopeUiComponents(template);
      this.contentRootElement.append(template.content.cloneNode(true));
      this.onWidgetRootReady();
    }

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
    async onWidgetRootReady() { }

    async init() {
      await super.init?.();

      this.#initWidgetRoot();
    }
  });

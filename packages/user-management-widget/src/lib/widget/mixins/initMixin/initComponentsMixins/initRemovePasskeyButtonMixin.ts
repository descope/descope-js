import { compose } from '../../../../helpers/compose';
import { withMemCache } from '../../../../helpers/generic';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { formMixin } from '../../../../mixins/formMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { getIsSingleUsersSelected } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initRemovePasskeyModalMixin } from './initRemovePasskeyModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initRemovePasskeyButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitRemovePasskeyButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initRemovePasskeyModalMixin,
      formMixin,
    )(superclass) {
      removePasskeyButton: ButtonDriver;

      #initRemovePasskeyButton() {
        this.removePasskeyButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="remove-passkey"]'),
          { logger: this.logger },
        );

        this.removePasskeyButton.disable();
        this.removePasskeyButton.onClick(() => {
          this.removePasskeyModal.open();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (isSingleUserSelected: ReturnType<typeof getIsSingleUsersSelected>) => {
          if (isDisabled) {
            this.removePasskeyButton.enable();
          } else {
            this.removePasskeyButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initRemovePasskeyButton();

        this.subscribe(
          this.#onIsUserSelectedUpdate.bind(this),
          getIsSingleUsersSelected,
        );
      }
    },
);

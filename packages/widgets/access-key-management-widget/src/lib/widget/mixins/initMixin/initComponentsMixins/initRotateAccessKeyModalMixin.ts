import {
  ButtonDriver,
  ModalDriver,
  TextDriver,
} from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import {
  getSelectedAccessKeys,
  getSelectedAccessKeysDetailsForDisplay,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initRotatedAccessKeyModalMixin } from './initRotatedAccessKeyModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initRotateAccessKeyModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitRotateAccessKeyModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      formMixin,
      loggerMixin,
      initWidgetRootMixin,
      initRotatedAccessKeyModalMixin,
    )(superclass) {
      rotateAccessKeyModal: ModalDriver;

      async #initRotateAccessKeyModal() {
        this.rotateAccessKeyModal = this.createModal();
        this.rotateAccessKeyModal.setContent(
          createTemplate(
            await this.fetchWidgetPage('rotate-access-key-modal.html'),
          ),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.rotateAccessKeyModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.rotateAccessKeyModal.close());

        const submitButton = new ButtonDriver(
          () =>
            this.rotateAccessKeyModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );
        submitButton.onClick(async () => {
          const selected = getSelectedAccessKeys(this.state)?.[0];
          if (!selected) {
            this.rotateAccessKeyModal.close();
            return;
          }
          const res: Record<string, any> = await this.actions.rotateAccessKey({
            id: selected.id,
          });
          this.rotateAccessKeyModal.close();

          if (res?.payload?.cleartext) {
            this.setFormData(this.rotatedAccessKeyModal.ele, {
              'generated-key': res.payload.cleartext,
            });
            this.rotatedAccessKeyModal.open();
          }
        });

        const description = new TextDriver(
          this.rotateAccessKeyModal.ele?.querySelector('[data-id="body-text"]'),
          { logger: this.logger },
        );

        this.rotateAccessKeyModal.beforeOpen = () => {
          const accessKeyDetails = getSelectedAccessKeysDetailsForDisplay(
            this.state,
          );
          description.text = `Rotate ${accessKeyDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initRotateAccessKeyModal();
      }
    },
);

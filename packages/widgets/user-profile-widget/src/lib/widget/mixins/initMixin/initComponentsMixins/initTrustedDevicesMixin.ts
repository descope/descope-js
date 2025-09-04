import {
  DeviceListDriver,
  FlowDriver,
  ModalDriver,
} from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import {
  cookieConfigMixin,
  loggerMixin,
  modalMixin,
  themeMixin,
} from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { createFlowTemplate } from '../../helpers';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { getTrustedDevices } from '../../../state/selectors';

export const initTrustedDevicesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TrustedDevicesMixinClass extends compose(
      flowSyncThemeMixin,
      themeMixin,
      stateManagementMixin,
      loggerMixin,
      cookieConfigMixin,
      initWidgetRootMixin,
      modalMixin,
    )(superclass) {
      deviceList: DeviceListDriver;

      #modal: ModalDriver;

      #flow: FlowDriver;

      #initModal() {
        if (!this.deviceList.flowId) return;

        this.#modal = this.createModal({ 'data-id': 'untrust-device' });
        this.#flow = new FlowDriver(
          () => this.#modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#modal.afterClose = this.#initModalContent.bind(this);
        this.#initModalContent();
        this.syncFlowTheme(this.#flow);
      }

      #initModalContent() {
        this.#modal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.deviceList.flowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
          }),
        );
        this.#flow.onSuccess(() => {
          this.#modal.close();
          this.actions.getMe();
        });
      }

      #initDeviceList(deviceList: ReturnType<typeof getTrustedDevices>) {
        this.deviceList = new DeviceListDriver(
          () => this.shadowRoot?.querySelector('descope-trusted-devices'),
          { logger: this.logger },
        );

        this.deviceList.onClick(() => {
          this.#modal?.open();
        });

        this.deviceList.data = deviceList;
      }

      onValueUpdate = withMemCache((data) => {
        this.deviceList.data = data;
      });

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initDeviceList(getTrustedDevices(this.state));
        this.#initModal();

        // this.#onDeviceRemove(getPicture(this.state));

        this.subscribe(this.onValueUpdate.bind(this), getTrustedDevices);
      }
    },
);

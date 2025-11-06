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
import { getTrustedDevices, getUserId } from '../../../state/selectors';

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
        this.#modal.afterClose = () => this.#initModalContent('');
        this.syncFlowTheme(this.#flow);
      }

      #initModalContent(deviceId: string = '') {
        this.#modal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.deviceList.flowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            form: { deviceId },
          }),
        );

        this.#flow.onSuccess(() => {
          this.#modal.close();
          this.actions.listDevices({
            userId: getUserId(this.state),
          });
        });
      }

      #initDeviceList(deviceList: ReturnType<typeof getTrustedDevices>) {
        this.deviceList.onRemoveDeviceClick(({ id }) => {
          this.#initModalContent(id);
          this.#modal?.open();
        });

        this.deviceList.data = deviceList;
      }

      async #fetchTrustedDevices() {
        await this.actions.listDevices({
          userId: getUserId(this.state),
        });
      }

      updateDeviceList = withMemCache((data) => {
        this.deviceList.data = data;
      });

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.deviceList = new DeviceListDriver(
          () => this.shadowRoot?.querySelector('descope-trusted-devices'),
          { logger: this.logger },
        );

        if (this.deviceList.isExists) {
          await this.#fetchTrustedDevices();
          this.#initDeviceList(getTrustedDevices(this.state));
          this.#initModal();
          this.subscribe(this.updateDeviceList.bind(this), getTrustedDevices);
        }
      }
    },
);

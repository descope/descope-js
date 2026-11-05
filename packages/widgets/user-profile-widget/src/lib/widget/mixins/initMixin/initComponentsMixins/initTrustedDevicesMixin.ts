import { DeviceListDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { localeMixin, loggerMixin, themeMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getTrustedDevices, getUserId } from '../../../state/selectors';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initTrustedDevicesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TrustedDevicesMixinClass extends compose(
      localeMixin,
      themeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      deviceList: DeviceListDriver;

      #untrustRunner: FlowRunner | undefined;

      #initDeviceList(deviceList: ReturnType<typeof getTrustedDevices>) {
        this.deviceList.onRemoveDeviceClick(({ id }) => {
          // the flow needs the device being removed, so the content cannot be
          // built until the user picks one - see presetContent below
          this.#untrustRunner?.open({ form: { deviceId: id } });
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

          this.#untrustRunner = this.createFlowRunner({
            dataId: 'untrust-device',
            flowId: this.deviceList.flowId,
            presetContent: false,
            onSuccess: () =>
              this.actions.listDevices({ userId: getUserId(this.state) }),
          });

          this.subscribe(this.updateDeviceList.bind(this), getTrustedDevices);
        }
      }
    },
);

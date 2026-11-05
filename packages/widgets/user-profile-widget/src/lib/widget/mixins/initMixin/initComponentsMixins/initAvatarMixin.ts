import { AvatarDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { localeMixin, loggerMixin, themeMixin } from '@descope/sdk-mixins';
import { getName, getPicture } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initAvatarMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class AvatarMixinClass extends compose(
      localeMixin,
      themeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      avatar: AvatarDriver;

      #runner: FlowRunner | undefined;

      #initAvatar() {
        this.avatar = new AvatarDriver(
          () => this.shadowRoot?.querySelector('descope-avatar'),
          { logger: this.logger },
        );

        this.avatar.onClick(() => {
          this.#runner?.open();
        });
      }

      #onPictureUpdate = withMemCache(
        (picture: ReturnType<typeof getPicture>) => {
          this.avatar.image = picture;
        },
      );

      #onNameUpdate = withMemCache((name: ReturnType<typeof getName>) => {
        this.avatar.displayName = name;
      });

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initAvatar();

        this.#runner = this.createFlowRunner({
          dataId: 'update-pic',
          flowId: this.avatar.flowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#onPictureUpdate(getPicture(this.state));
        this.#onNameUpdate(getName(this.state));

        this.subscribe(this.#onPictureUpdate.bind(this), getPicture);

        this.subscribe(this.#onNameUpdate.bind(this), getName);
      }
    },
);

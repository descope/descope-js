import {
  AvatarDriver,
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
import { getName, getPicture } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { createFlowTemplate } from '../../helpers';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initAvatarMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class AvatarMixinClass extends compose(
      flowSyncThemeMixin,
      themeMixin,
      stateManagementMixin,
      loggerMixin,
      cookieConfigMixin,
      initWidgetRootMixin,
      modalMixin,
    )(superclass) {
      avatar: AvatarDriver;

      #modal: ModalDriver;

      #flow: FlowDriver;

      #initModal() {
        if (!this.avatar.flowId) return;

        this.#modal = this.createModal({ 'data-id': 'update-pic' });
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
            flowId: this.avatar.flowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
          }),
        );
        this.#flow.onSuccess(() => {
          this.#modal.close();
          this.actions.getMe();
        });
      }

      #initAvatar() {
        this.avatar = new AvatarDriver(
          () => this.shadowRoot?.querySelector('descope-avatar'),
          { logger: this.logger },
        );

        this.avatar.onClick(() => {
          this.#modal?.open();
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
        this.#initModal();

        this.#onPictureUpdate(getPicture(this.state));
        this.#onNameUpdate(getName(this.state));

        this.subscribe(this.#onPictureUpdate.bind(this), getPicture);

        this.subscribe(this.#onNameUpdate.bind(this), getName);
      }
    },
);

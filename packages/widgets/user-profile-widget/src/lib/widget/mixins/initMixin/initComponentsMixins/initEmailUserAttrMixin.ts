import { UserAttributeDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { localeMixin, loggerMixin } from '@descope/sdk-mixins';
import { getEmail, getEmailBadgeLabel } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initEmailUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class EmailUserAttrMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      emailUserAttr: UserAttributeDriver;

      #editRunner: FlowRunner | undefined;

      #deleteRunner: FlowRunner | undefined;

      #initEmailUserAttr() {
        this.emailUserAttr = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="email"]',
            ),
          { logger: this.logger },
        );

        this.emailUserAttr.onEditClick(() => {
          this.#editRunner?.open();
        });

        this.emailUserAttr.onDeleteClick(() => {
          this.#deleteRunner?.open();
        });
      }

      // (Re)build each preloaded flow whenever the value changes. The first
      // (seeding) call preloads it; a later change (e.g. a delete) rebuilds it
      // so the flow re-fetches fresh data instead of the value it captured
      // before. A flow that is open is left alone - see FlowRunner.refresh.
      #onValueUpdate = withMemCache((email: ReturnType<typeof getEmail>) => {
        this.emailUserAttr.value = email;
        this.#editRunner?.refresh();
        this.#deleteRunner?.refresh();
      });

      #onBadgeLabelUpdate = withMemCache(
        (badgeLabel: ReturnType<typeof getEmailBadgeLabel>) => {
          this.emailUserAttr.badgeLabel = badgeLabel;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initEmailUserAttr();

        this.#editRunner = this.createFlowRunner({
          dataId: 'edit-email',
          flowId: this.emailUserAttr.editFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#deleteRunner = this.createFlowRunner({
          dataId: 'delete-email',
          flowId: this.emailUserAttr.deleteFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#onValueUpdate(getEmail(this.state));
        this.#onBadgeLabelUpdate(getEmailBadgeLabel(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getEmail);
        this.subscribe(this.#onBadgeLabelUpdate.bind(this), getEmailBadgeLabel);
      }
    },
);

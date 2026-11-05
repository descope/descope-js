import { UserAttributeDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { localeMixin, loggerMixin } from '@descope/sdk-mixins';
import { getPhone, getPhoneBadgeLabel } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initPhoneUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PhoneUserAttrMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      phoneUserAttr: UserAttributeDriver;

      #editRunner: FlowRunner | undefined;

      #deleteRunner: FlowRunner | undefined;

      #initPhoneUserAttr() {
        this.phoneUserAttr = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="phone"]',
            ),
          { logger: this.logger },
        );

        this.phoneUserAttr.onEditClick(() => {
          this.#editRunner?.open();
        });

        this.phoneUserAttr.onDeleteClick(() => {
          this.#deleteRunner?.open();
        });
      }

      // (Re)build each preloaded flow whenever the value changes. The first
      // (seeding) call preloads it; a later change (e.g. a delete) rebuilds it
      // so the flow re-fetches fresh data instead of the value it captured
      // before. A flow that is open is left alone - see FlowRunner.refresh.
      #onValueUpdate = withMemCache((phone: ReturnType<typeof getPhone>) => {
        this.phoneUserAttr.value = phone;
        this.#editRunner?.refresh();
        this.#deleteRunner?.refresh();
      });

      #onBadgeLabelUpdate = withMemCache(
        (badgeLabel: ReturnType<typeof getPhoneBadgeLabel>) => {
          this.phoneUserAttr.badgeLabel = badgeLabel;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initPhoneUserAttr();

        this.#editRunner = this.createFlowRunner({
          dataId: 'edit-phone',
          flowId: this.phoneUserAttr.editFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#deleteRunner = this.createFlowRunner({
          dataId: 'delete-phone',
          flowId: this.phoneUserAttr.deleteFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#onValueUpdate(getPhone(this.state));
        this.#onBadgeLabelUpdate(getPhoneBadgeLabel(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getPhone);
        this.subscribe(this.#onBadgeLabelUpdate.bind(this), getPhoneBadgeLabel);
      }
    },
);

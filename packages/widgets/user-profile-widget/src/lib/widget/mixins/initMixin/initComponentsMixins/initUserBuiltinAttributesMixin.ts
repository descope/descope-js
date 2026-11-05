import { UserAttributeDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { localeMixin, loggerMixin } from '@descope/sdk-mixins';
import { getUserBuiltinAttrs } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initUserBuiltinAttributesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class UserBuiltinAttributesMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      // field name (e.g. `givenName`) -> driver wrapping the matching descope-user-attribute
      #drivers: Record<string, UserAttributeDriver> = {};

      // flow Id is key in all maps
      #editRunners: Record<string, FlowRunner | undefined> = {};

      #deleteRunners: Record<string, FlowRunner | undefined> = {};

      #initEditFlow(
        nodeEle: Element,
        field: string,
        driver: UserAttributeDriver,
      ) {
        const editFlowId = nodeEle.getAttribute('edit-flow-id');
        if (!editFlowId) return;

        this.#editRunners[editFlowId] = this.createFlowRunner({
          dataId: `edit-${field}`,
          flowId: editFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        driver.onEditClick(() => {
          this.#editRunners?.[editFlowId]?.open();
        });
      }

      // kept separate from the edit path to match the email/phone/name mixins
      #initDeleteFlow(
        nodeEle: Element,
        field: string,
        driver: UserAttributeDriver,
      ) {
        const deleteFlowId = nodeEle.getAttribute('delete-flow-id');
        if (!deleteFlowId) return;

        this.#deleteRunners[deleteFlowId] = this.createFlowRunner({
          dataId: `delete-${field}`,
          flowId: deleteFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        driver.onDeleteClick(() => {
          this.#deleteRunners?.[deleteFlowId]?.open();
        });
      }

      #initBuiltinUserAttrs() {
        const allBuiltinAttributesComponents =
          this.shadowRoot?.querySelectorAll(
            'descope-user-attribute[data-id^="builtin."]',
          );

        Array.from(allBuiltinAttributesComponents || []).forEach((nodeEle) => {
          const field = nodeEle.getAttribute('data-id').replace('builtin.', '');

          const driver = new UserAttributeDriver(nodeEle, {
            logger: this.logger,
          });
          this.#drivers[field] = driver;

          this.#initEditFlow(nodeEle, field, driver);
          this.#initDeleteFlow(nodeEle, field, driver);
        });
      }

      // (Re)build each preloaded flow whenever a value changes. The first
      // (seeding) call preloads it; a later change (e.g. a delete) rebuilds it
      // so the flow re-fetches fresh data instead of the value it captured
      // before. A flow that is open is left alone - see FlowRunner.refresh.
      #refreshFlowsContent() {
        Object.values(this.#editRunners).forEach((runner) => runner?.refresh());
        Object.values(this.#deleteRunners).forEach(
          (runner) => runner?.refresh(),
        );
      }

      #onValueUpdate = withMemCache(
        (userBuiltinAttributes: ReturnType<typeof getUserBuiltinAttrs>) => {
          Object.keys(this.#drivers).forEach((field) => {
            this.#drivers[field].value = (
              userBuiltinAttributes[field] || ''
            ).toString();
          });
          this.#refreshFlowsContent();
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initBuiltinUserAttrs();

        this.#onValueUpdate(getUserBuiltinAttrs(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getUserBuiltinAttrs);
      }
    },
);

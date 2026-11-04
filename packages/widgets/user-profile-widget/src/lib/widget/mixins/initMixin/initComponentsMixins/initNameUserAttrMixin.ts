import { UserAttributeDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { localeMixin, loggerMixin } from '@descope/sdk-mixins';
import { getName } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initNameUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class NameUserAttrMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      nameUserAttr: UserAttributeDriver;

      #editRunner: FlowRunner | undefined;

      #deleteRunner: FlowRunner | undefined;

      #initNameUserAttr() {
        this.nameUserAttr = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="name"]',
            ),
          { logger: this.logger },
        );

        this.nameUserAttr.onEditClick(() => {
          this.#editRunner?.open();
        });

        this.nameUserAttr.onDeleteClick(() => {
          this.#deleteRunner?.open();
        });
      }

      // (Re)build each preloaded flow whenever the value changes. The first
      // (seeding) call preloads it; a later change (e.g. a delete) rebuilds it
      // so the flow re-fetches fresh data instead of the value it captured
      // before. A flow that is open is left alone - see FlowRunner.refresh.
      #onValueUpdate = withMemCache((name: ReturnType<typeof getName>) => {
        this.nameUserAttr.value = name;
        this.#editRunner?.refresh();
        this.#deleteRunner?.refresh();
      });

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initNameUserAttr();

        this.#editRunner = this.createFlowRunner({
          dataId: 'edit-name',
          flowId: this.nameUserAttr.editFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#deleteRunner = this.createFlowRunner({
          dataId: 'delete-name',
          flowId: this.nameUserAttr.deleteFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#onValueUpdate(getName(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getName);
      }
    },
);

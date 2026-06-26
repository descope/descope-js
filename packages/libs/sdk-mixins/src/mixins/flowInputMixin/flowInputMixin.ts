import { createSingletonMixin, createFlowTemplate } from '@descope/sdk-helpers';
import { themeMixin } from '../themeMixin';

type FlowInputConfig = {
  flowId: string;
  // per-flow inputs the widget supplies; merged over the caller-supplied inputs
  client?: Record<string, any>;
  form?: Record<string, any>;
  // widget-specific context forwarded as-is (e.g. tenant, outboundAppId)
  tenant?: string;
  outboundAppId?: string;
};

/**
 * Exposes a widget's caller-supplied flow inputs (`client.*` / `form.*`) and
 * builds the internal `<descope-wc>` flow template with the widget's shared
 * config, forwarding those inputs into the flow-start call - the same way they
 * flow for a directly-embedded `<Descope>` flow.
 *
 * `createFlowTemplate` (the method) wraps the `createFlowTemplate` helper so
 * every flow a widget runs gets the shared config + inputs from one place,
 * instead of each call site rebuilding the config. Composes `themeMixin` for
 * the resolved `theme` / `styleId`; the rest are plain attribute reads.
 */
export const flowInputMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FlowInputMixinClass extends themeMixin(superclass) {
      // caller-supplied client context, forwarded as flow-start `options.client`
      get clientInput(): Record<string, any> {
        try {
          return JSON.parse(this.getAttribute('client')) || {};
        } catch (e) {
          return {};
        }
      }

      // caller-supplied form inputs (raw JSON string), forwarded as flow inputs
      get formInput(): string | undefined {
        return this.getAttribute('form') || undefined;
      }

      // merge a per-flow form (e.g. ids the widget supplies) over the
      // caller-supplied form inputs, with the per-flow values taking precedence
      #resolveForm(
        form?: Record<string, any>,
      ): Record<string, any> | string | undefined {
        const callerForm = this.formInput;
        if (!form) return callerForm;
        if (!callerForm) return form;
        try {
          return { ...JSON.parse(callerForm), ...form };
        } catch (e) {
          return form;
        }
      }

      createFlowTemplate({
        flowId,
        client,
        form,
        ...overrides
      }: FlowInputConfig) {
        return createFlowTemplate({
          projectId: this.getAttribute('project-id'),
          flowId,
          baseUrl: this.getAttribute('base-url') || '',
          baseStaticUrl: this.getAttribute('base-static-url') || '',
          baseCdnUrl: this.getAttribute('base-cdn-url') || '',
          refreshCookieName: this.getAttribute('refresh-cookie-name') || '',
          theme: this.theme,
          'style-id': this.styleId,
          locale: this.getAttribute('locale') || '',
          form: this.#resolveForm(form),
          client: { ...this.clientInput, ...client },
          ...overrides,
        });
      }
    },
);

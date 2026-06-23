import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  localeMixin,
  cookieConfigMixin,
  themeMixin,
} from '@descope/sdk-mixins';
import { createFlowTemplate } from './helpers';

/**
 * Exposes the widget's caller-supplied flow inputs (`client.*` / `form.*`) and
 * builds the internal `<descope-wc>` flow template with the widget's shared
 * config, forwarding those inputs into the flow-start call - the same way they
 * flow for a directly-embedded `<Descope>` flow.
 *
 * Use `buildFlowTemplate` instead of calling `createFlowTemplate` directly so
 * every flow the widget runs (edit, delete, generic-flow-button, redirect)
 * receives the inputs and the shared config from a single place.
 */
export const flowInputMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FlowInputMixinClass extends compose(
      localeMixin,
      cookieConfigMixin,
      themeMixin,
    )(superclass) {
      // caller-supplied client context, forwarded as flow-start `options.client`
      get clientInput(): Record<string, string> {
        try {
          return JSON.parse(this.getAttribute('client')) || {};
        } catch (e) {
          return {};
        }
      }

      // caller-supplied form inputs (raw JSON string), forwarded as flow inputs.
      // kept as a string - createFlowTemplate stringifies and <descope-wc>
      // parses it back via transformFlowInputFormData, matching <Descope>.
      get formInput(): string | undefined {
        return this.getAttribute('form') || undefined;
      }

      // merge a per-flow form (e.g. passkey ids the widget supplies) over the
      // caller-supplied form inputs, with the per-flow values taking precedence.
      #resolveForm(
        form?: Record<string, string>,
      ): Record<string, string> | string | undefined {
        const callerForm = this.formInput;
        if (!form) return callerForm;
        if (!callerForm) return form;
        try {
          return { ...JSON.parse(callerForm), ...form };
        } catch (e) {
          return form;
        }
      }

      buildFlowTemplate({
        flowId,
        client,
        form,
      }: {
        flowId: string;
        client?: Record<string, string>;
        form?: Record<string, string>;
      }) {
        return createFlowTemplate({
          locale: this.locale,
          projectId: this.projectId,
          flowId,
          baseUrl: this.baseUrl,
          baseStaticUrl: this.baseStaticUrl,
          baseCdnUrl: this.baseCdnUrl,
          refreshCookieName: this.refreshCookieName,
          theme: this.theme,
          'style-id': this.styleId,
          form: this.#resolveForm(form),
          client: { ...this.clientInput, ...client },
        });
      }
    },
);

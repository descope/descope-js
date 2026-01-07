import { onMount, onCleanup, createSignal, Show, type JSX } from 'solid-js';
import { isServer } from 'solid-js/web';
import { useDescopeContext } from './hooks';
import type { DescopeProps } from './types';
import { baseHeaders } from './constants';
import { getGlobalSdk } from './sdk';

export function Descope(props: DescopeProps): JSX.Element {
  let ref: HTMLElement | undefined;
  const [isLoaded, setIsLoaded] = createSignal(false);
  const context = useDescopeContext();

  onMount(async () => {
    if (isServer || !ref) return;

    await import('@descope/web-component');

    const DescopeWc = customElements.get('descope-wc');
    if (DescopeWc) {
      (DescopeWc as any).sdkConfigOverrides = {
        baseHeaders,
        persistTokens: false,
        hooks: {
          get beforeRequest() {
            return getGlobalSdk()?.httpClient?.hooks?.beforeRequest;
          },
          set beforeRequest(_) {},
        },
      };
    }

    const handleSuccess = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (context.sdk?.httpClient?.hooks?.afterRequest) {
        await context.sdk.httpClient.hooks.afterRequest(
          {} as any,
          new Response(JSON.stringify(customEvent.detail)),
        );
      }
      props.onSuccess?.(customEvent);
    };

    const handleError = (e: Event) => {
      props.onError?.(e as CustomEvent);
    };

    const handleReady = (e: Event) => {
      setIsLoaded(true);
      props.onReady?.(e as CustomEvent);
    };

    ref.addEventListener('success', handleSuccess);
    ref.addEventListener('error', handleError);
    ref.addEventListener('ready', handleReady);

    onCleanup(() => {
      ref?.removeEventListener('success', handleSuccess);
      ref?.removeEventListener('error', handleError);
      ref?.removeEventListener('ready', handleReady);
    });
  });

  return (
    <Show when={!isServer} fallback={<div>Loading...</div>}>
      <form>
        <descope-wc
          ref={ref}
          project-id={context.projectId}
          flow-id={props.flowId}
          base-url={context.baseUrl}
          base-static-url={context.baseStaticUrl}
          base-cdn-url={context.baseCdnUrl}
          theme={props.theme}
          locale={props.locale}
          nonce={props.nonce}
          tenant={props.tenant}
          auto-focus={props.autoFocus}
          validate-on-blur={props.validateOnBlur}
          restart-on-error={props.restartOnError}
          debug={props.debug}
          telemetry-key={props.telemetryKey}
          redirect-url={props.redirectUrl}
          outbound-app-id={props.outboundAppId}
          outbound-app-scopes={props.outboundAppScopes}
          popup-origin={props.popupOrigin}
          style-id={props.styleId}
          dismiss-screen-error-on-input={props.dismissScreenErrorOnInput}
          store-last-authenticated-user={context.storeLastAuthenticatedUser}
          keep-last-authenticated-user-after-logout={
            context.keepLastAuthenticatedUserAfterLogout
          }
          refresh-cookie-name={context.refreshCookieName}
          external-request-id={props.externalRequestId}
          form={JSON.stringify(props.form)}
          client={JSON.stringify(props.client)}
          error-transformer={props.errorTransformer as any}
          logger={props.logger as any}
          on-screen-update={props.onScreenUpdate as any}
          custom-storage={context.customStorage as any}
        >
          {props.children}
        </descope-wc>
      </form>
    </Show>
  );
}

export function SignInFlow(props: Omit<DescopeProps, 'flowId'>): JSX.Element {
  return <Descope flowId="sign-in" {...props} />;
}

export function SignUpFlow(props: Omit<DescopeProps, 'flowId'>): JSX.Element {
  return <Descope flowId="sign-up" {...props} />;
}

export function SignUpOrInFlow(
  props: Omit<DescopeProps, 'flowId'>,
): JSX.Element {
  return <Descope flowId="sign-up-or-in" {...props} />;
}

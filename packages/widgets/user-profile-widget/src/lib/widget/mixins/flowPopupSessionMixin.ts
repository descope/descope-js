import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { Sdk } from '../api/sdk';
import { stateManagementMixin } from './stateManagementMixin';

// stateManagementMixin already composes apiMixin, and compose() erases the
// members a mixin adds, so `api` is reached by cast - the same way the other
// mixins in this widget reach across
type ApiHost = { api: Sdk };

/**
 * Re-establishes this window's session after a flow ran in a popup.
 *
 * The popup runs on another origin, so the flow's result never reaches this
 * window's storage. Worse, the flow may have changed the user - a new email, a
 * new password - leaving us holding a session whose claims no longer match.
 *
 * So the session is refreshed on **every** popup close, successful or
 * abandoned: a flow can change the user and then the user closes the window
 * without finishing, and we would still be stale.
 *
 * `flowRunnerMixin` calls `onFlowPopupClosed` through a runtime check rather
 * than a typed dependency - the mixin types erase added members, so a
 * cross-mixin call cannot be enforced at compile time here.
 */
export const flowPopupSessionMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FlowPopupSessionMixinClass extends compose(
      loggerMixin,
      stateManagementMixin,
    )(superclass) {
      async #refreshSession(): Promise<'ok' | 'unauthenticated' | 'failed'> {
        try {
          const res = await (this as unknown as ApiHost).api.refresh();
          if (res?.ok) return 'ok';
          // a 401 here is not a malfunction: some flows deliberately end other
          // sessions, so "you are signed out" is the correct outcome
          return res?.code === 401 ? 'unauthenticated' : 'failed';
        } catch (e) {
          this.logger?.debug('Session refresh threw', e);
          return 'failed';
        }
      }

      async onFlowPopupClosed() {
        let outcome = await this.#refreshSession();

        // one retry, for the transient case only
        if (outcome === 'failed') outcome = await this.#refreshSession();

        if (outcome === 'unauthenticated') {
          // reuse the channel the host app already handles for logout rather
          // than inventing a second "your session ended" signal
          this.dispatchEvent(new CustomEvent('logout'));
          return;
        }

        if (outcome === 'failed') {
          this.logger?.error(
            'Could not refresh the session after a popup flow; the widget may be showing stale data',
          );
          this.dispatchEvent(
            new CustomEvent('error', {
              detail: { message: 'session-refresh-failed' },
            }),
          );
          return;
        }

        // refresh first, then re-read: getMe on a stale token either fails or
        // returns claims we already have
        this.actions.getMe();
      }
    },
);

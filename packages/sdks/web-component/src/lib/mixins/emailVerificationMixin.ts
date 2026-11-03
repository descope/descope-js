/* eslint-disable import/prefer-default-export */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import {
  clearEmailVerificationInput,
  hasEmailVerificationField,
  injectEmailVerificationInput,
  readEmailVerificationToken,
} from '../helpers/emailVerification';

// What the mixin needs from its host. Defined as an interface (not imported)
// to avoid a circular dependency on DescopeWc. Exported so declaration emit
// can name it from BaseDescopeWc's composed base class.
export interface EmailVerificationHost {
  sdk?: {
    emailVerification?: {
      start: () => Promise<{
        ok: boolean;
        data?: { nonce?: string };
        error?: { errorDescription?: string };
      }>;
    };
  };
}

/**
 * Browser email verification: fetches a nonce for screens with an email
 * verification field, mounts the hidden token input the browser writes into,
 * and reads the token on submit.
 */
export const emailVerificationMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin)(superclass);

    return class EmailVerificationMixinClass extends BaseClass {
      // the nonce request of the current screen, used to drop nonces that
      // resolve after the screen changed
      #evpNonce?: Promise<string | undefined>;

      get #host() {
        return this as unknown as EmailVerificationHost;
      }

      clearEmailVerification() {
        this.#evpNonce = undefined;
        clearEmailVerificationInput(this);
      }

      // the browser needs a form owning the email field to verify it, so only
      // fetch a nonce (single use, so one per screen) when there is one
      startEmailVerification(fragment: DocumentFragment) {
        const emailVerification = this.#host.sdk?.emailVerification;
        if (
          !emailVerification ||
          !hasEmailVerificationField(fragment) ||
          !this.closest('form')
        ) {
          return undefined;
        }

        this.#evpNonce = emailVerification
          .start()
          .then((res) => {
            if (!res.ok || !res.data?.nonce) {
              this.logger.warn(
                'Email verification start failed',
                res.error?.errorDescription,
              );
              return undefined;
            }
            return res.data.nonce;
          })
          .catch((e) => {
            this.logger.warn('Email verification start failed', e?.message);
            return undefined;
          });

        return this.#evpNonce;
      }

      // called once the screen is rendered; a nonce that resolves after the
      // screen changed belongs to the old screen and is dropped
      mountEmailVerification(evpNonce?: Promise<string | undefined>) {
        evpNonce?.then((nonce) => {
          if (nonce && this.#evpNonce === evpNonce) {
            injectEmailVerificationInput(this, nonce);
          }
        });
      }

      // buttons that skip validation (back, social login) don't submit the
      // email, so they don't use up its single use token
      emailVerificationToken(submitter: HTMLElement) {
        if (submitter.getAttribute('formnovalidate') === 'true') {
          return '';
        }
        return readEmailVerificationToken(this);
      }
    };
  },
);

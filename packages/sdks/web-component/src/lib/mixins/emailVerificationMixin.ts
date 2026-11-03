/* eslint-disable import/prefer-default-export */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { DESCOPE_ATTRIBUTE_EXCLUDE_FIELD } from '../constants';

// Browser email verification (Chrome's Email Verification Protocol): the
// browser finds a hidden autocomplete="email-verification-token" input under
// the form that owns the email field, and writes the verification token into
// it only while that form's submit event is being dispatched

const EVP_TOKEN_ATTRIBUTE = 'data-evp-token';

const hasEmailVerificationField = (root: ParentNode) =>
  !!root.querySelector('descope-email-field[email-verification="true"]');

const clearEmailVerificationInput = (host: HTMLElement) => {
  host
    .querySelectorAll(`[${EVP_TOKEN_ATTRIBUTE}]`)
    .forEach((ele) => ele.remove());
};

// appended to the host light DOM, so the browser finds it under the host form
const injectEmailVerificationInput = (host: HTMLElement, nonce: string) => {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.setAttribute('autocomplete', 'email-verification-token');
  input.setAttribute(DESCOPE_ATTRIBUTE_EXCLUDE_FIELD, 'true');
  input.setAttribute(EVP_TOKEN_ATTRIBUTE, 'true');
  // set before insertion: under a CSP header the nonce attribute is blanked
  // on connect, and the browser reads the internal nonce slot
  input.nonce = nonce;
  input.setAttribute('nonce', nonce);
  host.appendChild(input);
};

// Submits the host form so the browser writes the token, and captures the
// submit event so the page never navigates. Returns '' when there is no
// token input, no form, or the form did not dispatch submit
const readEmailVerificationToken = (host: HTMLElement): string => {
  const input = host.querySelector<HTMLInputElement>(
    `[${EVP_TOKEN_ATTRIBUTE}]`,
  );
  const form = host.closest('form');
  if (!input || !form) return '';

  let token = '';
  // on window in the capture phase, so no page listener can stop the event
  // before it is cancelled and the form submits for real
  const onSubmit = (e: Event) => {
    if (e.target !== form) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    token = input.value;
    // single use, so it is not left readable in the page
    input.value = '';
  };
  window.addEventListener('submit', onSubmit, true);
  // not a real submit, so unrelated controls of an app form are not validated
  const { noValidate } = form;
  form.noValidate = true;
  try {
    form.requestSubmit();
  } finally {
    form.noValidate = noValidate;
    window.removeEventListener('submit', onSubmit, true);
  }
  return token;
};

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

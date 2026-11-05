/* eslint-disable import/prefer-default-export */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import type { createSdk } from '@descope/web-js-sdk';
import { DESCOPE_ATTRIBUTE_EXCLUDE_FIELD } from '../constants';
import { isChrome } from '../helpers';

// Browser email verification (Chrome's Email Verification Protocol): the
// browser finds a hidden autocomplete="email-verification-token" input under
// the form that owns the email field, and writes the verification token into
// it only while that form's submit event is being dispatched

const EVP_TOKEN_ATTRIBUTE = 'data-evp-token';
const EVP_FIELD_SELECTOR = 'descope-email-field[email-verification="true"]';

// Chrome starts issuing the token when the email field blurs, and a submit
// before the token is ready gets none. Nothing tells the page it is ready,
// so the submit waits until this long after the blur
const EVP_ISSUANCE_WAIT_MS = 900;

const hasEmailVerificationField = (root: ParentNode) =>
  !!root.querySelector(EVP_FIELD_SELECTOR);

const isInEmailVerificationField = (e: Event) =>
  e
    .composedPath()
    .some((ele) => ele instanceof Element && ele.matches(EVP_FIELD_SELECTOR));

// focus inside shadow DOM shows on document.activeElement as the outer host
const blurFocusedElement = () => {
  let ele = document.activeElement;
  while (ele?.shadowRoot?.activeElement) ele = ele.shadowRoot.activeElement;
  if (ele instanceof HTMLElement) ele.blur();
};

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

// What the mixin needs from its host. Defined as an interface (not imported
// from DescopeWc) to avoid a circular dependency. Exported so declaration emit
// can name it from BaseDescopeWc's composed base class.
export interface EmailVerificationHost {
  sdk?: Pick<ReturnType<typeof createSdk>, 'emailVerification'>;
}

/**
 * Browser email verification: fetches a nonce for screens with an email
 * verification field, injects the hidden token input the browser writes into,
 * and reads the token on submit.
 */
export const emailVerificationMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin)(superclass);

    return class EmailVerificationMixinClass extends BaseClass {
      // the nonce request of the current screen, used to drop nonces that
      // resolve after the screen changed
      #evpNonce?: Promise<void>;

      #evpFieldFocused = false;

      #evpFieldBlurredAt = 0;

      #onEvpFieldFocus = (e: FocusEvent) => {
        if (!isInEmailVerificationField(e)) return;
        this.#evpFieldFocused = e.type === 'focusin';
        if (e.type === 'focusout') this.#evpFieldBlurredAt = Date.now();
      };

      get #host() {
        return this as unknown as EmailVerificationHost;
      }

      clearEmailVerification() {
        this.#evpNonce = undefined;
        this.#evpFieldFocused = false;
        this.#evpFieldBlurredAt = 0;
        clearEmailVerificationInput(this);
      }

      // the browser needs a form owning the email field to verify it, so only
      // fetch a nonce (single use, so one per screen) when there is one.
      // Not awaited by the render, the input is injected when the nonce arrives
      startEmailVerification(fragment: DocumentFragment) {
        const emailVerification = this.#host.sdk?.emailVerification;
        if (
          !emailVerification ||
          !isChrome() ||
          !hasEmailVerificationField(fragment) ||
          !this.closest('form')
        ) {
          return;
        }

        // on the shadow root: a focus move between two elements inside it, like
        // the email field to the submit button, does not reach the host.
        // Adding the same listener again is a no-op
        this.shadowRoot?.addEventListener('focusin', this.#onEvpFieldFocus);
        this.shadowRoot?.addEventListener('focusout', this.#onEvpFieldFocus);

        const evpNonce = emailVerification
          .start()
          .then((res) => {
            if (!res.ok || !res.data?.nonce) {
              this.logger.warn(
                'Email verification start failed',
                res.error?.errorDescription,
              );
              return;
            }
            // a nonce that resolves after the screen changed belongs to the old screen
            if (this.#evpNonce === evpNonce) {
              injectEmailVerificationInput(this, res.data.nonce);
            }
          })
          .catch((e) => {
            this.logger.warn('Email verification start failed', e?.message);
          });
        this.#evpNonce = evpNonce;
      }

      // buttons that skip validation (back, social login) don't submit the
      // email, so they don't use up its single use token
      async emailVerificationToken(submitter: HTMLElement) {
        if (
          submitter.getAttribute('formnovalidate') === 'true' ||
          !this.querySelector(`[${EVP_TOKEN_ATTRIBUTE}]`) ||
          !this.shadowRoot?.querySelector<HTMLInputElement>(EVP_FIELD_SELECTOR)
            ?.value
        ) {
          return '';
        }
        // pressing Enter submits with the email field still focused
        if (this.#evpFieldFocused) blurFocusedElement();
        const wait =
          this.#evpFieldBlurredAt + EVP_ISSUANCE_WAIT_MS - Date.now();
        if (wait > 0) {
          await new Promise((resolve) => {
            setTimeout(resolve, wait);
          });
        }
        const token = readEmailVerificationToken(this);
        // single use, so a later submit on this screen doesn't read it again.
        // An empty read keeps the input, so a fixed email can still get one
        if (token) clearEmailVerificationInput(this);
        return token;
      }
    };
  },
);

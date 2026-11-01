import { DESCOPE_ATTRIBUTE_EXCLUDE_FIELD } from '../constants';

// Browser email verification (Chrome's Email Verification Protocol): the
// browser finds a hidden autocomplete="email-verification-token" input under
// the form that owns the email field, and writes the verification token into
// it only while that form's submit event is being dispatched

const EVP_TOKEN_ATTRIBUTE = 'data-evp-token';

export const hasEmailVerificationField = (root: ParentNode) =>
  !!root.querySelector('descope-email-field[email-verification="true"]');

export const clearEmailVerificationInput = (host: HTMLElement) => {
  host
    .querySelectorAll(`[${EVP_TOKEN_ATTRIBUTE}]`)
    .forEach((ele) => ele.remove());
};

// appended to the host light DOM, so the browser finds it under the host form
export const injectEmailVerificationInput = (
  host: HTMLElement,
  nonce: string,
) => {
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
// token input, no form, or the form did not dispatch submit (e.g. a
// customer form that failed constraint validation)
export const readEmailVerificationToken = (host: HTMLElement): string => {
  const input = host.querySelector<HTMLInputElement>(
    `[${EVP_TOKEN_ATTRIBUTE}]`,
  );
  const form = host.closest('form');
  if (!input || !form) return '';

  let token = '';
  const onSubmit = (e: Event) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    token = input.value;
  };
  form.addEventListener('submit', onSubmit, true);
  try {
    form.requestSubmit();
  } finally {
    form.removeEventListener('submit', onSubmit, true);
  }
  return token;
};

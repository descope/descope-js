/* eslint-disable import/prefer-default-export */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import {
  DESCOPE_ATTRIBUTE_EXCLUDE_FIELD,
  DESCOPE_LAST_SUBMITTED_LOGIN_ID_SESSION_STORAGE_KEY,
} from '../constants';
import { getFirstNonEmptyValue } from '../helpers';
import type { ScreenStateUser } from '../types';

const LOGIN_ID_FIELDS = ['externalId', 'email', 'phone'];
const PASSWORD_FIELDS = ['newPassword', 'password'];

const USERNAME_ANCHOR_ATTRIBUTE = 'data-username-anchor';

// What the mixin needs from its host. Defined as an interface (not imported)
// to avoid a circular dependency on DescopeWc. Exported so declaration emit
// can name it from BaseDescopeWc's composed base class.
export interface PasswordManagerHost {
  contentRootElement?: HTMLElement;
  flowState?: { current?: { executionId?: string } };
  sdk?: { getLastUserLoginId?: () => string };
}

// the last identifier the user submitted on a previous screen in this flow
// (e.g. the email entered before a magic link was sent), used when neither
// the flow state nor a previous authentication provides one.
// kept in sessionStorage (tab scoped, cleared when the tab closes) so it
// survives page reloads during the flow, and scoped to the flow execution so
// a stale identifier is never carried into another flow (or another user)
// running in the same tab
const getLastSubmittedLoginId = (executionId: string): string => {
  // a missing execution id must never match anything, otherwise two flows
  // without one would share the stored identifier
  if (!executionId) {
    return '';
  }
  try {
    const raw = window.sessionStorage?.getItem(
      DESCOPE_LAST_SUBMITTED_LOGIN_ID_SESSION_STORAGE_KEY,
    );
    if (!raw) {
      return '';
    }
    const stored = JSON.parse(raw);
    return stored.executionId === executionId ? stored.loginId || '' : '';
  } catch (e) {
    return '';
  }
};

const setLastSubmittedLoginId = (loginId: string, executionId: string) => {
  if (!loginId || !executionId) {
    return;
  }
  try {
    window.sessionStorage?.setItem(
      DESCOPE_LAST_SUBMITTED_LOGIN_ID_SESSION_STORAGE_KEY,
      JSON.stringify({ executionId, loginId }),
    );
  } catch (e) {
    // sessionStorage unavailable, losing reload persistence is acceptable
  }
};

const clearUsernameAnchorIfExists = () => {
  document
    .querySelectorAll(`[${USERNAME_ANCHOR_ATTRIBUTE}="true"]`)
    .forEach((ele) => ele.remove());
};

const findPasswordComponent = (contentRootEle: Element) =>
  contentRootEle.querySelector('descope-new-password') ||
  contentRootEle.querySelector('descope-password');

// an identifier is already on screen when there is an autocomplete="username"
// input, or a component collecting one of the login id fields (e.g.
// descope-email-field renders its input inside a closed shadow root, so only
// its name attribute is visible from here)
const hasLoginIdField = (roots: Element[]) => {
  const selector = [
    'input[autocomplete="username"]',
    ...LOGIN_ID_FIELDS.map((field) => `[name="${field}"]`),
  ].join(', ');
  return roots.some((root) => root.querySelector(selector));
};

const createUsernameAnchor = (loginId: string) => {
  const input = document.createElement('input');
  input.setAttribute('autocomplete', 'username');
  input.setAttribute('name', 'username');
  input.setAttribute('type', 'email');
  input.setAttribute('readonly', 'true');
  input.setAttribute('tabindex', '-1');
  input.setAttribute('aria-hidden', 'true');
  // never collect the anchor's value into the submitted form data
  input.setAttribute(DESCOPE_ATTRIBUTE_EXCLUDE_FIELD, 'true');
  // cleaned up by clearUsernameAnchorIfExists between screens
  input.setAttribute(USERNAME_ANCHOR_ATTRIBUTE, 'true');
  // some password managers read the markup value rather than the property
  input.setAttribute('value', loginId);
  input.value = loginId;
  // real input hidden via CSSOM: managers ignore type="hidden", and strict
  // CSP style-src blocks style attributes
  Object.assign(input.style, {
    position: 'absolute',
    opacity: '0',
    pointerEvents: 'none',
    height: '0',
    border: '0',
  });
  return input;
};

// Anchors a hidden autocomplete="username" input on password screens that
// have no identifier input, so password managers can associate the credential
// with a user (descope/etc#16712). Appended to the host light DOM — password
// manager save heuristics (verified on WebKit) do not scan shadow trees
const injectUsernameAnchorIfNeeded = (
  hostEle: HTMLElement,
  contentRootEle: Element,
  user: ScreenStateUser | undefined,
  logger: { debug: (...args: string[]) => void },
) => {
  const loginId = user?.email || user?.loginIds?.[0];

  if (!findPasswordComponent(contentRootEle)) {
    logger.debug('Username anchor: no password component on screen');
    return;
  }
  if (!loginId) {
    logger.debug('Username anchor: no user identifier available');
    return;
  }
  if (hasLoginIdField([hostEle, contentRootEle])) {
    logger.debug('Username anchor: screen already has an identifier field');
    return;
  }

  logger.debug('Username anchor: injecting hidden username input');
  hostEle.appendChild(createUsernameAnchor(loginId));
};

/**
 * Password manager integrations: keeps track of the current screen's user
 * identifier, anchors a hidden username input on password screens that have
 * no identifier input, and stores submitted credentials via the Credential
 * Management API.
 */
export const passwordManagerMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin)(superclass);

    return class PasswordManagerMixinClass extends BaseClass {
      // the authenticated user of the current screen (if any), used as a
      // fallback identifier for password manager integrations on screens that
      // have no identifier input (e.g. step-up password change)
      #screenUser?: ScreenStateUser;

      get #host() {
        return this as unknown as PasswordManagerHost;
      }

      get #executionId() {
        return this.#host.flowState?.current?.executionId || '';
      }

      // called on every screen render. flow state does not always carry the
      // user (e.g. after magic link auth), so fall back to the login id
      // submitted earlier in this flow, then to the last authenticated user
      updateScreenUser(stateUser?: ScreenStateUser) {
        this.#screenUser = {
          email: stateUser?.email,
          loginIds: stateUser?.loginIds?.length
            ? stateUser.loginIds
            : [
                getLastSubmittedLoginId(this.#executionId) ||
                  this.#host.sdk?.getLastUserLoginId?.(),
              ].filter(Boolean),
        };
      }

      updateUsernameAnchor() {
        // clear the previous screen's anchor, so each screen gets an anchor
        // only if it needs one
        clearUsernameAnchorIfExists();

        injectUsernameAnchorIfNeeded(
          this,
          this.#host.contentRootElement,
          this.#screenUser,
          this.logger,
        );
      }

      // called after a successful next(): on flows that render their first
      // screen before the flow starts, the execution id only exists on the
      // response, so prefer it over the current flow state
      captureLastSubmittedLoginId(formData = {}, responseExecutionId?: string) {
        const loginId = getFirstNonEmptyValue(formData, LOGIN_ID_FIELDS);
        if (loginId) {
          setLastSubmittedLoginId(
            loginId,
            responseExecutionId || this.#executionId,
          );
        }
      }

      // handle storing passwords in password managers
      storeCredentials(formData = {}) {
        const id =
          getFirstNonEmptyValue(formData, LOGIN_ID_FIELDS) ||
          this.#screenUser?.email ||
          this.#screenUser?.loginIds?.[0];
        const password = getFirstNonEmptyValue(formData, PASSWORD_FIELDS);

        // PasswordCredential not supported in Firefox
        if (id && password) {
          try {
            if (!globalThis.PasswordCredential) {
              return;
            }
            const cred = new globalThis.PasswordCredential({ id, password });

            navigator?.credentials?.store?.(cred);
          } catch (e) {
            this.logger.error('Could not store credentials', e.message);
          }
        }
      }
    };
  },
);

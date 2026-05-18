/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  fixtures,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import DescopeWc from '../src/lib/descope-wc';

describe('web-component theme', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('it should set the theme based on the user parameter', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="light"></descope-wc>`;

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle?.querySelector('#root');

    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'light'));
  });

  it('it should set the theme based on OS settings when theme is "os"', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    window.matchMedia = jest.fn(() => ({ matches: true })) as any;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="os"></descope-wc>`;

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle?.querySelector('#root');

    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'dark'));
  });

  it('it should set the theme to light if not provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    window.matchMedia = jest.fn(() => ({ matches: true })) as any;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle?.querySelector('#root');

    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'light'));
  });

  it('should throw an error when theme has a wrong value', async () => {
    const errorSpy = jest.spyOn(console, 'error');
    class Test extends DescopeWc {
      constructor() {
        super();
        Object.defineProperty(this, 'shadowRoot', {
          value: {
            isConnected: true,
            appendChild: () => {},
            host: { closest: () => true },
          },
        });
      }

      public get projectId() {
        return '1';
      }

      public get flowId() {
        return '1';
      }
    }

    customElements.define('test-theme', Test as any);
    document.body.innerHTML = `<h1>Custom element test</h1> <test-theme flow-id="otpSignInEmail" project-id="1" theme="lol"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          '[Descope]',
          'Supported theme values are "light", "dark", or leave empty for using the OS theme',
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should switch theme on the fly', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent =
      '<button id="email">Button</button><span>It works!</span>';

    const DescopeUI = {
      componentsThemeManager: { currentThemeName: undefined },
    };
    globalThis.DescopeUI = DescopeUI;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc theme="light" flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Button'), {
      timeout: WAIT_TIMEOUT,
    });

    const wc = document.querySelector('descope-wc');
    wc.setAttribute('theme', 'dark');

    const rootEle = wc.shadowRoot.querySelector('#root');

    await waitFor(
      () =>
        expect(DescopeUI.componentsThemeManager.currentThemeName).toBe('dark'),
      { timeout: 3000 },
    );
    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'dark'), {
      timeout: 3000,
    });
  }, 5000);

  it('When WC loads it injects the theme', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';
    fixtures.themeContent = {
      light: { globals: 'button { color: red; }' },
      dark: { globals: 'button { color: blue; }' },
    };

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="light"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(
      () =>
        expect(global.CSSStyleSheet.prototype.replaceSync).toHaveBeenCalledWith(
          (fixtures.themeContent as any).light.globals +
            (fixtures.themeContent as any).dark.globals,
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should inject CSS variables when a valid customization attribute is set', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = {
      light: { globals: '' },
      dark: { globals: '' },
    };

    const customization = JSON.stringify({
      light: { globals: { colors: { primary: { base: 'red' } } } },
      dark: { globals: { colors: { primary: { base: 'blue' } } } },
    });

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" customization='${customization}'></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(
      () =>
        expect(global.CSSStyleSheet.prototype.replaceSync).toHaveBeenCalledWith(
          expect.stringContaining(
            '[data-theme="light"]{--descope-colors-primary-base:red;}',
          ),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () =>
        expect(global.CSSStyleSheet.prototype.replaceSync).toHaveBeenCalledWith(
          expect.stringContaining(
            '[data-theme="dark"]{--descope-colors-primary-base:blue;}',
          ),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should log an error and not crash when customization attribute contains invalid JSON', async () => {
    const errorSpy = jest.spyOn(console, 'error');
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = {
      light: { globals: 'body{}' },
      dark: { globals: '' },
    };

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" customization='not-valid-json'></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          '[Descope]',
          expect.stringContaining('Failed to parse customization attribute'),
          expect.anything(),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    // The theme globals should still be injected despite the parse failure
    await waitFor(
      () =>
        expect(global.CSSStyleSheet.prototype.replaceSync).toHaveBeenCalledWith(
          expect.stringContaining('body{}'),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should reload global style when customization attribute is updated', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = {
      light: { globals: '' },
      dark: { globals: '' },
    };

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const wc = document.querySelector('descope-wc');
    const customization = JSON.stringify({
      light: { globals: { colors: { primary: { base: 'green' } } } },
    });
    wc.setAttribute('customization', customization);

    await waitFor(
      () =>
        expect(global.CSSStyleSheet.prototype.replaceSync).toHaveBeenCalledWith(
          expect.stringContaining(
            '[data-theme="light"]{--descope-colors-primary-base:green;}',
          ),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should reload global style without customization when customization attribute is removed', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = {
      light: { globals: 'body{}' },
      dark: { globals: '' },
    };

    const customization = JSON.stringify({
      light: { globals: { colors: { primary: { base: 'red' } } } },
    });

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" customization='${customization}'></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const wc = document.querySelector('descope-wc');
    wc.removeAttribute('customization');

    await waitFor(
      () => {
        const calls = (global.CSSStyleSheet.prototype.replaceSync as jest.Mock)
          .mock.calls;
        const lastCall = calls[calls.length - 1]?.[0] as string;
        expect(lastCall).not.toContain('--descope-colors-primary-base');
        expect(lastCall).toContain('body{}');
      },
      { timeout: WAIT_TIMEOUT },
    );
  });
});

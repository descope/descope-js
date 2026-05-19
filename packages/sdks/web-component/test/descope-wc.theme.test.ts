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

  it('should inject themeOverride last in DOM', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = {
      light: { globals: '[data-theme="light"]{--descope-color-bg:white;}' },
      dark: { globals: '[data-theme="dark"]{--descope-color-bg:black;}' },
    };

    const themeOverride = JSON.stringify({
      light: { globals: { colors: { primary: { base: 'red' } } } },
      dark: { globals: { colors: { primary: { base: 'blue' } } } },
    });

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" theme-override='${themeOverride}'></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const replaceSync = global.CSSStyleSheet.prototype.replaceSync as jest.Mock;
    const expectedOverrideSnippet = '--descope-colors-primary-base:red';

    await waitFor(
      () => {
        const allCalls = replaceSync.mock.calls.map(
          ([css]: [string]) => css ?? '',
        );
        const themeCallIdx = allCalls.findIndex((css: string) =>
          css.includes('[data-theme="light"]{--descope-color-bg:white;}'),
        );
        expect(themeCallIdx).toBeGreaterThanOrEqual(0);
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(replaceSync).toHaveBeenCalledWith(
          expect.stringContaining(expectedOverrideSnippet),
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    const allCalls = replaceSync.mock.calls.map(([css]: [string]) => css ?? '');
    // themeOverride must be the last replaceSync call overall
    expect(allCalls[allCalls.length - 1]).toContain(expectedOverrideSnippet);

    // Verify themeOverride sheet is last in adoptedStyleSheets
    const wc = document.querySelector('descope-wc') as Element;
    const shadowRoot = wc.shadowRoot as ShadowRoot;
    if ('adoptedStyleSheets' in shadowRoot) {
      const sheets = shadowRoot.adoptedStyleSheets;
      expect(sheets.length).toBeGreaterThanOrEqual(4);
      const overrideSheet = sheets.find(
        (sheet) => (sheet as any).cssText?.includes(expectedOverrideSnippet),
      );
      expect(overrideSheet).toBeDefined();
      expect(overrideSheet.index).toBe(sheets.length - 1);
    }
  });

  it('should log an error and not crash when themeOverride attribute contains invalid JSON', async () => {
    const errorSpy = jest.spyOn(console, 'error');
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = {
      light: { globals: '[data-theme="light"]{--descope-color-bg:white;}' },
      dark: { globals: '' },
    };

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" theme-override='not-valid-json'></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          '[Descope]',
          expect.stringContaining('Failed to parse theme-override attribute'),
          expect.anything(),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    // The theme globals should still be injected despite the parse failure
    const wc = document.querySelector('descope-wc') as Element;
    const shadowRoot = wc.shadowRoot as ShadowRoot;
    if ('adoptedStyleSheets' in shadowRoot) {
      const sheets = shadowRoot.adoptedStyleSheets;
      const themeSheet = sheets.find(
        (sheet) =>
          (sheet as any).cssText?.includes(
            '[data-theme="light"]{--descope-color-bg:white;}',
          ),
      );
      expect(themeSheet).toBeDefined();
      expect(themeSheet.index).toBe(sheets.length - 1);
    }
  });

  it('should reload global style when themeOverride attribute is updated', async () => {
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
    const themeOverride = JSON.stringify({
      light: { globals: { colors: { primary: { base: 'green' } } } },
    });
    wc.setAttribute('theme-override', themeOverride);

    const replaceSync = global.CSSStyleSheet.prototype.replaceSync as jest.Mock;
    const expectedOverrideSnippet = '--descope-colors-primary-base:green';

    await waitFor(
      () =>
        expect(replaceSync).toHaveBeenCalledWith(
          expect.stringContaining(expectedOverrideSnippet),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    const allCalls = replaceSync.mock.calls.map(([css]: [string]) => css ?? '');
    // themeOverride must be the last replaceSync call overall
    expect(allCalls[allCalls.length - 1]).toContain(expectedOverrideSnippet);
  });

  it('should clear custom style when themeOverride attribute is removed', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = {
      light: { globals: '[data-theme="light"]{--descope-color-bg:white;}' },
      dark: { globals: '' },
    };

    const themeOverride = JSON.stringify({
      light: { globals: { colors: { primary: { base: 'red' } } } },
    });

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" theme-override='${themeOverride}'></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const replaceSync = global.CSSStyleSheet.prototype.replaceSync as jest.Mock;
    const expectedOverrideSnippet = '--descope-colors-primary-base:red';

    await waitFor(
      () =>
        expect(replaceSync).toHaveBeenCalledWith(
          expect.stringContaining(expectedOverrideSnippet),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    const wc = document.querySelector('descope-wc');
    wc.removeAttribute('theme-override');

    const shadowRoot = wc.shadowRoot as ShadowRoot;
    if ('adoptedStyleSheets' in shadowRoot) {
      const sheets = shadowRoot.adoptedStyleSheets;
      expect(sheets.length).toBeGreaterThanOrEqual(4);
      const overrideSheet = sheets[sheets.length - 1];
      expect(overrideSheet).toBeDefined();
      expect(overrideSheet).toEqual('');
    }
  });
});

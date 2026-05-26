/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  fixtures,
  fetchMock,
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

  it('fetches the tenant theme when the tenant attribute is set', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = { light: { globals: '' }, dark: { globals: '' } };

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" tenant="T123"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(
      () =>
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('T123/theme.json'),
          expect.anything(),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('injects tenant CSS globals when a tenant theme is fetched', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = { light: { globals: '' }, dark: { globals: '' } };
    fixtures.configContent = {
      flows: { otpSignInEmail: { version: 1 } },
      componentsVersion: '1.2.3',
    };

    const tenantTheme = {
      light: { globals: '.tenant-light{color:red;}' },
      dark: { globals: '.tenant-dark{color:pink;}' },
    };

    fetchMock.mockImplementation((url: string) => {
      const res = { ok: true, headers: new Headers({ 'x-geo': 'XX' }) };
      if (url.includes('tenant-a/theme.json'))
        return { ...res, json: () => tenantTheme };
      if (url.endsWith('theme.json'))
        return { ...res, json: () => fixtures.themeContent };
      if (url.endsWith('.html'))
        return { ...res, text: () => fixtures.pageContent };
      if (url.endsWith('config.json'))
        return { ...res, json: () => fixtures.configContent };
      return { ok: false };
    });

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" tenant="tenant-a"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const wc = document.querySelector('descope-wc') as Element;
    const shadowRoot = wc.shadowRoot as ShadowRoot;
    if ('adoptedStyleSheets' in shadowRoot) {
      await waitFor(
        () => {
          const sheets = shadowRoot.adoptedStyleSheets;
          const tenantSheet = sheets.find(
            (sheet) =>
              (sheet as any).cssText?.includes(tenantTheme.light.globals),
          );
          expect(tenantSheet).toBeDefined();
          expect(tenantSheet.index).toBe(sheets.length - 1);
        },
        { timeout: WAIT_TIMEOUT },
      );
    }
  });

  it('fetches a new tenant theme when the tenant attribute changes', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = { light: { globals: '' }, dark: { globals: '' } };

    const tenantBTheme = {
      light: { globals: '.tenant-b-light{color:blue;}' },
      dark: { globals: '.tenant-b-dark{color:navy;}' },
    };

    fetchMock.mockImplementation((url: string) => {
      const res = { ok: true, headers: new Headers({ 'x-geo': 'XX' }) };
      if (url.includes('tenant-b/theme.json'))
        return { ...res, json: () => tenantBTheme };
      if (url.endsWith('theme.json'))
        return { ...res, json: () => fixtures.themeContent };
      if (url.endsWith('.html'))
        return { ...res, text: () => fixtures.pageContent };
      if (url.endsWith('config.json'))
        return { ...res, json: () => fixtures.configContent };
      return { ok: false };
    });

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" tenant="tenant-a"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const wc = document.querySelector('descope-wc') as Element;
    wc.setAttribute('tenant', 'tenant-b');

    const shadowRoot = wc.shadowRoot as ShadowRoot;
    if ('adoptedStyleSheets' in shadowRoot) {
      await waitFor(
        () => {
          const sheets = shadowRoot.adoptedStyleSheets;
          const tenantSheet = sheets.find(
            (sheet) =>
              (sheet as any).cssText?.includes(tenantBTheme.light.globals),
          );
          expect(tenantSheet).toBeDefined();
          expect(tenantSheet.index).toBe(sheets.length - 1);
        },
        { timeout: WAIT_TIMEOUT },
      );
    }
  });

  it('logs an error and skips the fetch when tenant contains path-traversal characters', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = { light: { globals: '' }, dark: { globals: '' } };

    // Render without a tenant first so the component reaches a stable state.
    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    // Inject a mock logger so the error reaches a jest.fn() rather than
    // the module-load-time-bound defaultLogger (which bypasses spyOn).
    const wc = document.querySelector('descope-wc') as any;
    const mockError = jest.fn();
    wc.logger = {
      error: mockError,
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    };

    wc.setAttribute('tenant', '../evil');

    await waitFor(
      () =>
        expect(mockError).toHaveBeenCalledWith(
          'Invalid tenant attribute: must contain only alphanumeric characters, hyphens, or underscores',
        ),
      { timeout: WAIT_TIMEOUT },
    );

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('evil'),
      expect.anything(),
    );
  });

  it('tenant style appears after project style, and clearing tenant does not corrupt project style', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    fixtures.pageContent = '<span>It works!</span>';
    fixtures.themeContent = {
      light: { globals: '.project-light{background:white;}' },
      dark: { globals: '.project-dark{background:black;}' },
    };

    const tenantTheme = {
      light: { globals: '.tenant-light{color:red;}' },
      dark: { globals: '.tenant-dark{color:pink;}' },
    };

    fetchMock.mockImplementation((url: string) => {
      const res = { ok: true, headers: new Headers({ 'x-geo': 'XX' }) };
      if (url.includes('tenant-a/theme.json'))
        return { ...res, json: () => tenantTheme };
      if (url.endsWith('theme.json'))
        return { ...res, json: () => fixtures.themeContent };
      if (url.endsWith('.html'))
        return { ...res, text: () => fixtures.pageContent };
      if (url.endsWith('config.json'))
        return { ...res, json: () => fixtures.configContent };
      return { ok: false };
    });

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" tenant="tenant-a"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const wc = document.querySelector('descope-wc') as Element;
    const shadowRoot = wc.shadowRoot as ShadowRoot;

    if ('adoptedStyleSheets' in shadowRoot) {
      // Verify tenant sheet is injected after the project sheet.
      await waitFor(
        () => {
          const sheets = shadowRoot.adoptedStyleSheets;
          const projectSheet = sheets.find(
            (sheet) => (sheet as any).cssText?.includes('.project-light'),
          );
          const tenantSheet = sheets.find(
            (sheet) => (sheet as any).cssText?.includes('.tenant-light'),
          );
          expect(projectSheet).toBeDefined();
          expect(tenantSheet).toBeDefined();
          expect((tenantSheet as any).index).toBeGreaterThan(
            (projectSheet as any).index,
          );
        },
        { timeout: WAIT_TIMEOUT },
      );

      // Remove the tenant attribute and verify the project style is untouched.
      wc.removeAttribute('tenant');

      await waitFor(
        () => {
          const sheets = shadowRoot.adoptedStyleSheets;
          const tenantSheet = sheets.find(
            (sheet) => (sheet as any).cssText?.includes('.tenant-light'),
          );
          expect(tenantSheet).toBeUndefined();

          const projectSheet = sheets.find(
            (sheet) => (sheet as any).cssText?.includes('.project-light'),
          );
          expect(projectSheet).toBeDefined();
          expect(projectSheet.index).toBe(sheets.length - 1);
        },
        { timeout: WAIT_TIMEOUT },
      );
    }
  });

  it('changing style-id does not corrupt the tenant style', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    fixtures.pageContent = '<span>It works!</span>';

    const styleV1Theme = {
      light: { globals: '.style-v1-light{color:green;}' },
      dark: { globals: '.style-v1-dark{color:teal;}' },
    };
    const styleV2Theme = {
      light: { globals: '.style-v2-light{color:purple;}' },
      dark: { globals: '.style-v2-dark{color:violet;}' },
    };
    const tenantTheme = {
      light: { globals: '.tenant-light{color:red;}' },
      dark: { globals: '.tenant-dark{color:pink;}' },
    };

    fetchMock.mockImplementation((url: string) => {
      const res = { ok: true, headers: new Headers({ 'x-geo': 'XX' }) };
      if (url.includes('tenant-a/theme.json'))
        return { ...res, json: () => tenantTheme };
      if (url.endsWith('style-v2.json'))
        return { ...res, json: () => styleV2Theme };
      if (url.endsWith('style-v1.json'))
        return { ...res, json: () => styleV1Theme };
      if (url.endsWith('.html'))
        return { ...res, text: () => fixtures.pageContent };
      if (url.endsWith('config.json'))
        return { ...res, json: () => fixtures.configContent };
      return { ok: false };
    });

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" style-id="style-v1" tenant="tenant-a"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const wc = document.querySelector('descope-wc') as Element;
    const shadowRoot = wc.shadowRoot as ShadowRoot;

    if ('adoptedStyleSheets' in shadowRoot) {
      // Confirm initial state: both project and tenant sheets are present.
      await waitFor(
        () => {
          const sheets = shadowRoot.adoptedStyleSheets;
          expect(
            sheets.find((s) => (s as any).cssText?.includes('.style-v1-light')),
          ).toBeDefined();
          expect(
            sheets.find((s) => (s as any).cssText?.includes('.tenant-light')),
          ).toBeDefined();
        },
        { timeout: WAIT_TIMEOUT },
      );

      // Change the style-id and verify tenant style is not corrupted.
      wc.setAttribute('style-id', 'style-v2');

      await waitFor(
        () => {
          const sheets = shadowRoot.adoptedStyleSheets;
          expect(
            sheets.find((s) => (s as any).cssText?.includes('.style-v2-light')),
          ).toBeDefined();
          expect(
            sheets.find((s) => (s as any).cssText?.includes('.tenant-light')),
          ).toBeDefined();
        },
        { timeout: WAIT_TIMEOUT },
      );
    }
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

    const expectedOverrideSnippet = '--descope-colors-primary-base:red';

    // Verify themeOverride sheet is last in adoptedStyleSheets
    const wc = document.querySelector('descope-wc') as Element;
    const shadowRoot = wc.shadowRoot as ShadowRoot;
    if ('adoptedStyleSheets' in shadowRoot) {
      const sheets = shadowRoot.adoptedStyleSheets;
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

    const expectedOverrideSnippet = '--descope-colors-primary-base:green';

    const shadowRoot = wc.shadowRoot as ShadowRoot;
    if ('adoptedStyleSheets' in shadowRoot) {
      const sheets = shadowRoot.adoptedStyleSheets;
      const overrideSheet = sheets.find(
        (sheet) => (sheet as any).cssText?.includes(expectedOverrideSnippet),
      );
      expect(overrideSheet).toBeDefined();
      expect(overrideSheet.index).toBe(sheets.length - 1);
    }
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

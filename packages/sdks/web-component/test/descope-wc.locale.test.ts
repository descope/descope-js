/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  fixtures,
  fetchMock,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { ASSETS_FOLDER, CONFIG_FILENAME } from '../src/lib/constants';
import { generateSdkResponse } from './testUtils';

const THEME_DEFAULT_FILENAME = 'theme.json';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('locale', () => {
    it('should fetch the data from the correct path when locale provided without target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail locale="en-us"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );
    });

    it(
      'should fetch the data from the correct path when locale provided with target locales',
      async () => {
        startMock.mockReturnValue(generateSdkResponse());

        fixtures.configContent = {
          ...fixtures.configContent,
          flows: {
            otpSignInEmail: {
              targetLocales: ['en-US'],
            },
          },
        };

        fixtures.pageContent =
          '<input id="email"></input><span>It works!</span>';

        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="en-Us"></descope-wc>`;

        await waitFor(() => screen.getByShadowText('It works!'), {
          timeout: WAIT_TIMEOUT,
        });

        const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en-us.html`;
        const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
        const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

        const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
        const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
        const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringMatching(htmlUrlPathRegex),
          expect.any(Object),
        );

        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringMatching(themeUrlPathRegex),
          expect.any(Object),
        );

        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringMatching(configUrlPathRegex),
          expect.any(Object),
        );
      },
      WAIT_TIMEOUT,
    );

    it('should fetch the data from the correct path when locale provided and not part of target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['de'],
          },
        },
      };

      fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="en-us"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );
    });

    it('should fetch the data from the correct path when locale provided in navigator', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['en'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'en-Us',
        writable: true,
      });

      fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      // the browser locale keeps its region even when only its language part is a target locale
      expect(startMock.mock.calls[0][1].locale).toBe('en-us');

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when zh-TW locale provided in navigator', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.configContent = {
        flows: {
          otpSignInEmail: {
            targetLocales: ['zh-TW'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'zh-TW',
        writable: true,
      });

      fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-zh-tw.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when locale provided in navigator short form', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['en'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'en',
        writable: true,
      });

      fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when locale provided in navigator but not in target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['de'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'en-Us',
        writable: true,
      });

      fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when locale provided in navigator and request to locale fails', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['en'],
          },
        },
      };

      const fn = fetchMock.getMockImplementation();
      fetchMock.mockImplementation((url: string) => {
        if (url.endsWith('en.html')) {
          return { ok: false };
        }
        return fn(url);
      });

      Object.defineProperty(navigator, 'language', {
        value: 'en-Us',
        writable: true,
      });

      fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en.html`;
      const expectedHtmlFallbackPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_DEFAULT_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const htmlUrlFallbackPathRegex = new RegExp(
        `//[^/]+${expectedHtmlFallbackPath}$`,
      );
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlFallbackPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object),
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should pick the first locale of a preference list that is part of the target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['FR', 'en'],
          },
        },
      };

      fixtures.pageContent =
        '<input id="email"></input><span lang="autoDetect">It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="de-AT, fr ,en"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const fetchedUrls = fetchMock.mock.calls.map(([url]) => url);
      expect(fetchedUrls).toContainEqual(
        expect.stringMatching(
          new RegExp(`//[^/]+/pages/1/${ASSETS_FOLDER}/0-fr.html$`),
        ),
      );
      expect(fetchedUrls).not.toContainEqual(
        expect.stringMatching(/0-(de-at|de|en)\.html$/),
      );
      expect(startMock.mock.calls[0][1].locale).toBe('fr');
      expect(screen.getByShadowText('It works!')).toHaveAttribute('lang', 'fr');
    });

    it('should use the language part of a preference list entry and report the entry itself', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['fr', 'en'],
          },
        },
      };

      fixtures.pageContent =
        '<input id="email"></input><span lang="autoDetect">It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="fr-CA en"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const fetchedUrls = fetchMock.mock.calls.map(([url]) => url);
      expect(fetchedUrls).toContainEqual(
        expect.stringMatching(
          new RegExp(`//[^/]+/pages/1/${ASSETS_FOLDER}/0-fr.html$`),
        ),
      );
      expect(fetchedUrls).not.toContainEqual(
        expect.stringMatching(/0-(fr-ca|en)\.html$/),
      );
      expect(startMock.mock.calls[0][1].locale).toBe('fr-ca');
      expect(screen.getByShadowText('It works!')).toHaveAttribute(
        'lang',
        'fr-CA',
      );
    });

    it('should report the first locale of a preference list and fetch the default page when none is part of the target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['de'],
          },
        },
      };

      fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="pt-BR,it"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const fetchedUrls = fetchMock.mock.calls.map(([url]) => url);
      expect(fetchedUrls).toContainEqual(
        expect.stringMatching(
          new RegExp(`//[^/]+/pages/1/${ASSETS_FOLDER}/0.html$`),
        ),
      );
      expect(fetchedUrls).not.toContainEqual(
        expect.stringMatching(/0-[a-z-]+\.html$/),
      );
      expect(startMock.mock.calls[0][1].locale).toBe('pt-br');
    });

    it('should show the default page when the source language comes first in a preference list', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      // the source language (en) is not part of the target locales
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          otpSignInEmail: {
            targetLocales: ['fr'],
          },
        },
      };

      fixtures.pageContent =
        '<input id="email"></input><span lang="autoDetect">It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="en,fr"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const fetchedUrls = fetchMock.mock.calls.map(([url]) => url);
      expect(fetchedUrls).toContainEqual(
        expect.stringMatching(
          new RegExp(`//[^/]+/pages/1/${ASSETS_FOLDER}/0.html$`),
        ),
      );
      expect(fetchedUrls).not.toContainEqual(
        expect.stringMatching(/0-[a-z-]+\.html$/),
      );
      expect(startMock.mock.calls[0][1].locale).toBe('en');
      expect(screen.getByShadowText('It works!')).toHaveAttribute('lang', 'en');
    });
  });
});

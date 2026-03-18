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

import '../src/lib/descope-wc';

import { ASSETS_FOLDER, CONFIG_FILENAME } from '../src/lib/constants';

const THEME_DEFAULT_FILENAME = 'theme.json';

describe('web-component fetch path', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('should fetch the data from the correct path', async () => {
    startMock.mockReturnValue(generateSdkResponse());

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
  });

  it('should fetch the data from the correct path with custom style name', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" style-id="test"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
    const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/test.json`;
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

  it('should fetch the data from the correct base static url', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" base-static-url="http://base.url/pages"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/base.url\/pages.*\.html/),
      expect.any(Object),
    );
  });
});

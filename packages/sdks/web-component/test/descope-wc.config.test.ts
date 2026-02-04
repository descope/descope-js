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
  ensureFingerprintIds,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { ASSETS_FOLDER } from '../src/lib/constants';

describe('web-component config', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('it loads the fonts from the config when loading', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      ...fixtures.configContent,
      cssTemplate: {
        light: { fonts: { font1: { url: 'font.url' } } },
      },
    };

    fixtures.pageContent =
      '<descope-button id="submitterId">click</descope-button><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" theme="light" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 20000,
    });

    await waitFor(
      () =>
        expect(
          document.head.querySelector(`link[href="font.url"]`),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
  }, 20000);

  it('loads flow start screen if its in config file', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(startMock).not.toBeCalled();
    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/screen-0.html`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object),
    );
  });

  it('should fetch config file once', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(
      fetchMock.mock.calls.filter((call) => call[0].endsWith('config.json'))
        .length,
    ).toBe(1);
  });

  it('runs fingerprint when config contains the correct fields', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      flows: {
        'sign-in': {
          startScreenId: 'screen-0',
          fingerprintEnabled: true,
          fingerprintKey: 'fp-public-key',
        },
      },
    };

    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" base-url="http://base.url"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(ensureFingerprintIds).toHaveBeenCalledWith(
      'fp-public-key',
      'http://base.url',
    );
  });
});

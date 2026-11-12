/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fetchMock,
  fixtures,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import {
  URL_RUN_IDS_PARAM_NAME,
  URL_TOKEN_PARAM_NAME,
  URL_CODE_PARAM_NAME,
  URL_ERR_PARAM_NAME,
} from '../src/lib/constants';

describe('web-component urlParams', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('should clear the flow query params after render', async () => {
    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_1&code=123456`;
    nextMock.mockReturnValue(generateSdkResponse({}));

    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('should update the page when user changes the url query param value', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<input id="email" name="email"></input>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const logSpy = jest.spyOn(console, 'warn');

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_1`;

    fireEvent.popState(window);

    await waitFor(
      () =>
        expect(logSpy).toHaveBeenCalledWith(
          '[Descope]',
          'No screen was found to show',
          '',
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should update the page when user clicks on back', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: 20000,
    });

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_1`;

    fixtures.pageContent = '<input id="email"></input><span>It updated!</span>';

    fireEvent.popState(window);

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;
    const rootEle = shadowEle.querySelector('#content-root');
    const spyAddEventListener = jest.spyOn(rootEle, 'addEventListener');

    spyAddEventListener.mockImplementation(
      (_, cb) => typeof cb === 'function' && cb({} as Event),
    );

    await waitFor(() => screen.findByShadowText('It updated!'), {
      timeout: 20000,
    });
  });

  it('should call next with token when url contains "t" query param', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_TOKEN_PARAM_NAME}=token1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 1, '1.2.3', {
          token: 'token1',
          origin: 'http://localhost',
        }),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should call next with token when url contains "code" query param', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="flow-1" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 0, '1.2.3', {
          exchangeCode: 'code1',
          origin: 'http://localhost',
        }),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('should call next with the page origin when resuming from a redirect', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="flow-1" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith(
          '0',
          '0',
          'submit',
          0,
          '1.2.3',
          expect.objectContaining({ origin: 'http://localhost' }),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should call next with exchangeError when url contains "err" query param', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_ERR_PARAM_NAME}=err1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', 'submit', 1, '1.2.3', {
          exchangeError: 'err1',
          origin: 'http://localhost',
        }),
      { timeout: WAIT_TIMEOUT },
    );
    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  // Routers like single-spa fire a popstate for each replaceState the SDK makes
  // when it cleans the url, and deliver it after the url is already clean
  describe('popstate after the url params were cleared', () => {
    const resumeAndFirePopState = async (search: string) => {
      let resolveNext;
      nextMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveNext = resolve;
        }),
      );

      fixtures.pageContent = '<span>It works!</span>';

      window.location.search = search;
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => expect(window.location.search).toBe(''), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.popState(window);
      fireEvent.popState(window);

      await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      resolveNext(generateSdkResponse({ screenId: '1' }));

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });
    };

    it.each([
      [URL_TOKEN_PARAM_NAME, 'token', 'token1'],
      [URL_CODE_PARAM_NAME, 'exchangeCode', 'code1'],
      [URL_ERR_PARAM_NAME, 'exchangeError', 'err1'],
    ])(
      'should not restart the flow when resuming with "%s"',
      async (paramName, nextOptionName, value) => {
        await resumeAndFirePopState(
          `?${URL_RUN_IDS_PARAM_NAME}=0_0&${paramName}=${value}`,
        );

        expect(nextMock).toHaveBeenCalledTimes(1);
        expect(nextMock).toHaveBeenCalledWith(
          '0',
          '0',
          'submit',
          1,
          '1.2.3',
          expect.objectContaining({ [nextOptionName]: value }),
        );
        expect(startMock).not.toHaveBeenCalled();
      },
    );

    it('should not fetch the start screen of a flow that starts with a screen', async () => {
      fixtures.configContent.flows.otpSignInEmail.startScreenId = 'screen-0';

      await resumeAndFirePopState(
        `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_TOKEN_PARAM_NAME}=token1`,
      );

      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('screen-0'),
        expect.anything(),
      );
    });
  });
});

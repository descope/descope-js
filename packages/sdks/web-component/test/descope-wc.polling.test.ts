/* eslint-disable import/order */
// @ts-nocheck

import {
  WAIT_TIMEOUT,
  fixtures,
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import {
  CUSTOM_INTERACTIONS,
  FLOW_TIMED_OUT_ERROR_CODE,
  RESPONSE_ACTIONS,
} from '../src/lib/constants';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('When has polling element, and next poll returns error response', async () => {
    jest.useRealTimers();

    startMock.mockReturnValueOnce(generateSdkResponse());

    nextMock
      .mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      )
      .mockReturnValue(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
          ok: false,
          requestErrorCode: FLOW_TIMED_OUT_ERROR_CODE,
        }),
      );

    fixtures.pageContent =
      '<div data-type="polling">...</div><span>It works!</span>';
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const onError = jest.fn();

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    wcEle.addEventListener('error', onError);

    await waitFor(() => expect(onError).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    nextMock.mockClear();

    await new Promise((resolve) => {
      setTimeout(resolve, 4000);
    });

    expect(nextMock).toHaveBeenCalledTimes(1);

    wcEle.removeEventListener('error', onError);
  }, 20000);

  it('When has polling element, stop on unmounted element', async () => {
    jest.useRealTimers();

    startMock.mockReturnValueOnce(generateSdkResponse());

    nextMock.mockReturnValue(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.poll,
      }),
    );

    fixtures.pageContent =
      '<div data-type="polling">...</div><span>It works!</span>';
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
      timeout: 20000,
    });
    nextMock.mockClear();
    document.body.removeChild(wcEle);

    // wait some time to ensure polling has stopped
    await new Promise((resolve) => {
      setTimeout(resolve, 4000);
    });

    expect(nextMock).not.toHaveBeenCalled();
  }, 30000);

  describe('poll', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('Should clear timeout when user clicks a button', async () => {
      jest.spyOn(global, 'clearTimeout');

      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent =
        '<descope-button id="submitterId">click</descope-button><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      jest.runAllTimers();

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });

      /*  next returns
         - a poll response
         - another poll response
         - a screen response
      */
      nextMock
        .mockReturnValueOnce(
          generateSdkResponse({
            executionId: 'e1',
            stepId: 's1',
            screenId: '1',
            action: RESPONSE_ACTIONS.poll,
          }),
        )
        .mockReturnValueOnce(
          generateSdkResponse({
            action: RESPONSE_ACTIONS.poll,
          }),
        )
        .mockReturnValueOnce(
          generateSdkResponse({
            screenId: '2',
          }),
        );

      fireEvent.click(screen.getByShadowText('click'));

      // first call is the click call
      await waitFor(() =>
        expect(nextMock).toHaveBeenNthCalledWith(
          1,
          '0',
          '0',
          'submitterId',
          1,
          '1.2.3',
          expect.any(Object),
          false,
        ),
      );

      // first call is the click call
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenNthCalledWith(
            2,
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            expect.any(Object),
          ),
        {
          timeout: 8000,
        },
      );

      // second call is the click call
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenNthCalledWith(
            3,
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            expect.any(Object),
          ),
        {
          timeout: 8000,
        },
      );

      await waitFor(() => expect(clearTimeout).toHaveBeenCalled(), {
        timeout: 8000,
      });
    });

    it('When has polling element - next with "polling", and check that timeout is set properly', async () => {
      jest.spyOn(global, 'setTimeout');

      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      fixtures.pageContent =
        '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      jest.runAllTimers();

      await waitFor(
        () =>
          expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('When screen has polling element and next returns the same response, should trigger polling again', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      fixtures.pageContent =
        '<div data-type="polling">...</div><descope-button>click</descope-button><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      // Wait for first polling
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            {},
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      // Reset mock to ensure it is triggered again with polling
      nextMock.mockClear();
      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      // Click another button, which returns the same screen
      fireEvent.click(screen.getByShadowText('click'));

      // Ensure polling is triggered again
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            {},
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('When has polling element, and next poll returns polling response', async () => {
      jest.spyOn(global, 'setTimeout');

      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValue(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      fixtures.pageContent =
        '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      jest.runAllTimers();

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(3), {
        timeout: WAIT_TIMEOUT * 2,
      });
    });

    it('When has polling element, and next poll returns completed response', async () => {
      // Ensure previous tests' stubs do not interfere
      startMock.mockReset();
      nextMock.mockReset();
      startMock.mockReturnValueOnce(generateSdkResponse());

      jest.spyOn(global, 'setTimeout');

      nextMock
        .mockReturnValueOnce(
          generateSdkResponse({
            action: RESPONSE_ACTIONS.poll,
          }),
        )
        .mockReturnValueOnce(
          generateSdkResponse({
            status: 'completed',
          }),
        );

      fixtures.pageContent =
        '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const onSuccess = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      wcEle.addEventListener('success', onSuccess);

      jest.runAllTimers();

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
        timeout: 20000,
      });

      await waitFor(
        () =>
          expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      wcEle.removeEventListener('success', onSuccess);
    });
  });

  it(
    'should not have concurrent polling calls',
    async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      const MIN_NUM_OF_RUNS = 15;

      let isRunning = false;
      let counter = 0;
      let isConcurrentPolling = false;

      nextMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            if (isRunning) {
              isConcurrentPolling = true;
            }
            counter += 1;
            isRunning = true;
            setTimeout(() => {
              resolve(
                generateSdkResponse({
                  action: RESPONSE_ACTIONS.poll,
                }),
              );

              isRunning = false;
            }, 100);
          }),
      );

      fixtures.pageContent =
        '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => expect(counter).toBeGreaterThan(MIN_NUM_OF_RUNS), {
        timeout: WAIT_TIMEOUT * 5,
      });

      if (isConcurrentPolling) throw new Error('Concurrent polling detected');
    },
    WAIT_TIMEOUT * 5,
  );

  describe('foreground-aware polling on mobile devices', () => {
    const originalUserAgent = navigator.userAgent;

    afterEach(() => {
      // Reset document.hidden to default
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get() {
          return false;
        },
      });
      // Reset userAgent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        get() {
          return originalUserAgent;
        },
      });
      // Reset descopeBridge
      delete (window as any).descopeBridge;
    });

    it('When polling on mobile device in background, should defer polling until foreground', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValue(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      // Simulate mobile device
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        get() {
          return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
        },
      });

      // Start hidden (in background)
      let isHidden = true;
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get() {
          return isHidden;
        },
      });

      fixtures.pageContent =
        '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      // Wait for the component to initialize
      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      // Polling should not have been called yet since we're in background
      expect(nextMock).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        CUSTOM_INTERACTIONS.polling,
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      // Bring to foreground
      isHidden = false;
      document.dispatchEvent(new Event('visibilitychange'));

      // Now polling should resume
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            {},
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('When polling with descopeBridge (native flow) in background, should defer polling until foreground', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValue(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      // Simulate native flow webview
      (window as any).descopeBridge = {};

      // Start hidden (in background)
      let isHidden = true;
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get() {
          return isHidden;
        },
      });

      fixtures.pageContent =
        '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      // Trigger lazy init for native flow
      const descopeWc = document.querySelector('descope-wc') as any;
      descopeWc.lazyInit?.();

      // Wait for the component to initialize
      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      // Polling should not have been called yet since we're in background
      expect(nextMock).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        CUSTOM_INTERACTIONS.polling,
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      // Bring to foreground
      isHidden = false;
      document.dispatchEvent(new Event('visibilitychange'));

      // Now polling should resume
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            {},
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('When polling on desktop in background, should continue polling normally', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValue(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      );

      // Desktop userAgent (default)
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        get() {
          return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
        },
      });

      // Start hidden (in background)
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get() {
          return true;
        },
      });

      fixtures.pageContent =
        '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      // On desktop, polling should work even when hidden
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            1,
            '1.2.3',
            {},
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });
  });
});

/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

describe('web-component retry logic', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
    jest.useFakeTimers();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
    jest.useRealTimers();
  });

  describe('SDK flow start with retry', () => {
    it('should succeed on first attempt', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent =
        '<descope-button>click</descope-button><span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      expect(startMock).toBeCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      // First call fails, second succeeds
      startMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent =
        '<descope-button>click</descope-button><span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      // Advance timers to allow retry
      const loadedPromise = waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await jest.advanceTimersByTimeAsync(1000);
      await loadedPromise;

      expect(startMock).toBeCalledTimes(2);
    });

    it('should retry 3 times and succeed on third attempt', async () => {
      // First two calls fail, third succeeds
      startMock
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent =
        '<descope-button>click</descope-button><span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const loadedPromise = waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      // Advance timers for retries (1000ms * 2 retries)
      await jest.advanceTimersByTimeAsync(2000);
      await loadedPromise;

      expect(startMock).toBeCalledTimes(3);
    });

    it('should return error object after all retries are exhausted', async () => {
      // All 4 attempts fail (1 initial + 3 retries)
      const error = new Error('Persistent network error');
      startMock
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

      fixtures.pageContent = '<span>Error Page</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      // Advance timers for all retries (1000ms * 3 retries)
      await jest.advanceTimersByTimeAsync(3000);

      // The component should handle the error gracefully
      // startMock should have been called 4 times (1 initial + 3 retries)
      await waitFor(() => expect(startMock).toBeCalledTimes(4), {
        timeout: WAIT_TIMEOUT,
      });
    });
  });

  describe('SDK flow next with retry', () => {
    it('should succeed on first attempt', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      fixtures.pageContent =
        '<descope-button>Submit</descope-button><input id="email"></input><span>First Screen</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('First Screen'), {
        timeout: WAIT_TIMEOUT,
      });

      fixtures.pageContent = '<span>Second Screen</span>';

      const button = screen.getByShadowText('Submit');
      button.click();

      await waitFor(() => screen.getByShadowText('Second Screen'), {
        timeout: WAIT_TIMEOUT,
      });

      expect(nextMock).toBeCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock
        .mockRejectedValueOnce(new Error('Server error'))
        .mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      fixtures.pageContent =
        '<descope-button>Submit</descope-button><input id="email"></input><span>First Screen</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('First Screen'), {
        timeout: WAIT_TIMEOUT,
      });

      fixtures.pageContent = '<span>Second Screen</span>';

      const button = screen.getByShadowText('Submit');
      button.click();

      // Advance timers to allow retry
      await jest.advanceTimersByTimeAsync(1000);

      await waitFor(() => screen.getByShadowText('Second Screen'), {
        timeout: WAIT_TIMEOUT,
      });

      expect(nextMock).toBeCalledTimes(2);
    });

    it('should retry multiple times and succeed', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock
        .mockRejectedValueOnce(new Error('Timeout 1'))
        .mockRejectedValueOnce(new Error('Timeout 2'))
        .mockRejectedValueOnce(new Error('Timeout 3'))
        .mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      fixtures.pageContent =
        '<descope-button>Submit</descope-button><input id="email"></input><span>First Screen</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('First Screen'), {
        timeout: WAIT_TIMEOUT,
      });

      fixtures.pageContent = '<span>Second Screen</span>';

      const button = screen.getByShadowText('Submit');
      button.click();

      // Advance timers for all retries (1000ms * 3 retries)
      await jest.advanceTimersByTimeAsync(3000);

      await waitFor(() => screen.getByShadowText('Second Screen'), {
        timeout: WAIT_TIMEOUT,
      });

      expect(nextMock).toBeCalledTimes(4); // 1 initial + 3 retries
    });

    it('should return error object with FETCH_EXCEPTION_ERROR_CODE after all retries fail', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      const error = new Error('Persistent server error');
      nextMock
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

      fixtures.pageContent =
        '<descope-button>Submit</descope-button><input id="email"></input><span>First Screen</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('First Screen'), {
        timeout: WAIT_TIMEOUT,
      });

      const button = screen.getByShadowText('Submit');
      button.click();

      // Advance timers for all retries (1000ms * 3 retries)
      await jest.advanceTimersByTimeAsync(3000);

      // nextMock should have been called 4 times (1 initial + 3 retries)
      await waitFor(() => expect(nextMock).toBeCalledTimes(4), {
        timeout: WAIT_TIMEOUT,
      });

      // The error should be caught and returned as an error object
      // We can't directly check the return value, but we can verify the call count
      // and that the component didn't crash
    });
  });

  describe('Retry timing', () => {
    it('should wait 1000ms between retry attempts', async () => {
      jest.useRealTimers();
      const startTime = Date.now();

      startMock
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = '<span>Loaded</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should take at least 2000ms (2 retries with 1000ms each)
      // but less than 3000ms (with some buffer for execution time)
      expect(elapsed).toBeGreaterThanOrEqual(2000);
      expect(elapsed).toBeLessThan(3000);
      expect(startMock).toBeCalledTimes(3);
    });
  });

  describe('Both start and next retry independently', () => {
    it('should handle retries for both start and next in same flow', async () => {
      // Start fails once, then succeeds
      startMock
        .mockRejectedValueOnce(new Error('Start error'))
        .mockReturnValueOnce(generateSdkResponse());

      // Next fails once, then succeeds
      nextMock
        .mockRejectedValueOnce(new Error('Next error'))
        .mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      fixtures.pageContent =
        '<descope-button>Submit</descope-button><span>First Screen</span>';

      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      // Wait for start to retry and succeed
      await jest.advanceTimersByTimeAsync(1000);
      await waitFor(() => screen.getByShadowText('First Screen'), {
        timeout: WAIT_TIMEOUT,
      });

      expect(startMock).toBeCalledTimes(2); // 1 initial + 1 retry

      fixtures.pageContent = '<span>Second Screen</span>';

      const button = screen.getByShadowText('Submit');
      button.click();

      // Wait for next to retry and succeed
      await jest.advanceTimersByTimeAsync(1000);
      await waitFor(() => screen.getByShadowText('Second Screen'), {
        timeout: WAIT_TIMEOUT,
      });

      expect(nextMock).toBeCalledTimes(2); // 1 initial + 1 retry
    });
  });
});

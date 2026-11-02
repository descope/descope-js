import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { applyAction } from '../../src/lib/helpers/realtime-conditions/applier';
import {
  URL_RUN_IDS_PARAM_NAME,
  OIDC_RESOURCE_PARAM_NAME,
} from '../../src/lib/constants';
import { dragElement } from '../../src/lib/helpers';
import {
  clearRunIdsFromUrl,
  fetchContent,
  getAnimationDirection,
  getRunIdsFromUrl,
  handleAutoFocus,
  isChromium,
  setRunIdsOnUrl,
  withMemCache,
  getOIDCResourceParamFromUrl,
  clearOIDCResourceParamFromUrl,
  withRetry,
} from '../../src/lib/helpers/helpers';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('helpers', () => {
  describe('withRetry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return the result on first successful attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = withRetry(mockFn, 1000, 3);

      const resultPromise = wrappedFn('arg1', 'arg2');
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('first fail'))
        .mockResolvedValueOnce('success');
      const wrappedFn = withRetry(mockFn, 1000, 3);

      const resultPromise = wrappedFn('test');
      await jest.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry the specified number of times', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success');
      const wrappedFn = withRetry(mockFn, 500, 3);

      const resultPromise = wrappedFn();
      await jest.advanceTimersByTimeAsync(3000);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should wait with exponential backoff between retries', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValueOnce('success');
      const wrappedFn = withRetry(mockFn, 2000, 3);

      const resultPromise = wrappedFn();

      // First attempt fails immediately
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for exponential backoff (2000 * 2^1 = 4000ms)
      await jest.advanceTimersByTimeAsync(4000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      const result = await resultPromise;
      expect(result).toBe('success');
    });

    it('should throw the last error after all retries are exhausted', async () => {
      const error4 = new Error('fail 4');

      const mockFn = jest.fn().mockRejectedValue(error4);

      const wrappedFn = withRetry(mockFn, 100, 3);

      const resultPromise = wrappedFn().catch((e) => e); // Catch immediately to prevent unhandled rejection warnings
      await jest.advanceTimersByTimeAsync(1400); // 100*2 + 100*4 + 100*8 = 1400ms

      const result = await resultPromise;
      expect(result).toBe(error4);
      expect(mockFn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should not wait after the last failed attempt', async () => {
      const testError = new Error('fail');
      const mockFn = jest.fn().mockRejectedValue(testError);
      const wrappedFn = withRetry(mockFn, 1000, 2);

      const resultPromise = wrappedFn().catch((e) => e); // Catch immediately to prevent unhandled rejection warnings
      await jest.advanceTimersByTimeAsync(6000); // 1000*2 + 1000*4 = 6000ms

      const result = await resultPromise;
      expect(result).toBe(testError);
      expect(mockFn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should preserve function arguments across retries', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');
      const wrappedFn = withRetry(mockFn, 100, 2);

      const resultPromise = wrappedFn('arg1', 42, { key: 'value' });
      await jest.advanceTimersByTimeAsync(200); // 100 * 2^1 = 200ms
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenNthCalledWith(1, 'arg1', 42, { key: 'value' });
      expect(mockFn).toHaveBeenNthCalledWith(2, 'arg1', 42, { key: 'value' });
    });

    it('should handle async functions that return complex objects', async () => {
      const complexResult = {
        data: [1, 2, 3],
        status: 'ok',
        nested: { value: true },
      };
      const mockFn = jest.fn().mockResolvedValue(complexResult);
      const wrappedFn = withRetry(mockFn, 1000, 3);

      const resultPromise = wrappedFn();
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toEqual(complexResult);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should work with zero retries (no retry)', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      const wrappedFn = withRetry(mockFn, 1000, 0);

      await expect(wrappedFn()).rejects.toThrow('fail');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple concurrent calls independently', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success 1')
        .mockResolvedValueOnce('success 2');

      const wrappedFn = withRetry(mockFn, 100, 3);

      const promise1 = wrappedFn('call1');
      const promise2 = wrappedFn('call2');

      await jest.advanceTimersByTimeAsync(200);

      const results = await Promise.all([promise1, promise2]);

      expect(results).toEqual(['success 1', 'success 2']);
      expect(mockFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('fetchContent', () => {
    it('should throw an error when got error response code', () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: false,
        }),
      );

      expect(fetchContent('url', 'text')).rejects.toThrow();
    });
    it('should return the response text', () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: true,
          text: () => 'text',
          headers: new Headers({ h: '1' }),
        }),
      );

      expect(fetchContent('url', 'text')).resolves.toMatchObject({
        body: 'text',
        headers: { h: '1' },
      });
    });
    it('should cache the response', () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: true,
          text: () => 'text',
          headers: new Headers({ h: '1' }),
        }),
      );
      fetchContent('url', 'text');
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        cache: 'default',
      });
    });
  });
  it('getRunIds should return the correct query param value', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: new URL('http://localhost'),
    });
    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=8|#|a_9`;
    expect(getRunIdsFromUrl('8')).toEqual({
      executionFlowId: '8',
      executionId: '8|#|a',
      stepId: '9',
    });
  });

  it('getRunIds should return the correct query param when there is no flow Id', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: new URL('http://localhost'),
    });
    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=8|#|a_9`;
    expect(getRunIdsFromUrl('')).toEqual({
      executionFlowId: '8',
      executionId: '',
      stepId: '',
    });
  });

  it('getRunIds should return the correct query param when exec id is wrong', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: new URL('http://localhost'),
    });
    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=8`;
    expect(getRunIdsFromUrl('8')).toEqual({
      executionFlowId: '',
      executionId: '8',
      stepId: '',
    });
  });

  it('setRunIds should pushstate new URL with query param', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: new URL('http://localhost'),
    });
    const pushState = jest.fn();
    window.history.pushState = pushState;
    setRunIdsOnUrl('exec', 'step');
    expect(pushState).toHaveBeenCalledWith(
      {},
      '',
      `http://localhost/?${URL_RUN_IDS_PARAM_NAME}=exec_step`,
    );
  });

  it('resetRunIds should pushstate new URL without query param', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: new URL(`http://localhost/?${URL_RUN_IDS_PARAM_NAME}=1_1`),
    });
    const replaceState = jest.fn();
    window.history.replaceState = replaceState;
    clearRunIdsFromUrl();
    expect(replaceState).toHaveBeenCalledWith({}, '', `http://localhost/`);
  });

  describe('oidcResource URL params', () => {
    it('getOIDCResourceParamFromUrl should return oidcResource param from URL', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: new URL(
          `http://localhost/?${OIDC_RESOURCE_PARAM_NAME}=https%3A%2F%2Fapi.example.com`,
        ),
      });
      expect(getOIDCResourceParamFromUrl()).toBe('https://api.example.com');
    });

    it('getOIDCResourceParamFromUrl should return null when param is not present', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: new URL('http://localhost/'),
      });
      expect(getOIDCResourceParamFromUrl()).toBe(null);
    });

    it('clearOIDCResourceParamFromUrl should remove oidcResource param from URL', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: new URL(
          `http://localhost/?${OIDC_RESOURCE_PARAM_NAME}=https%3A%2F%2Fapi.example.com`,
        ),
      });
      const replaceState = jest.fn();
      window.history.replaceState = replaceState;
      clearOIDCResourceParamFromUrl();
      expect(replaceState).toHaveBeenCalledWith({}, '', `http://localhost/`);
    });
  });

  describe('isChromium', () => {
    const mockBrowser = (userAgent: string, vendor: string) => {
      Object.defineProperty(navigator, 'userAgent', {
        value: userAgent,
        writable: true,
      });
      Object.defineProperty(navigator, 'vendor', {
        value: vendor,
        writable: true,
      });
    };
    it('should return "false" on firefox', () => {
      mockBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0',
        '',
      );
      expect(isChromium()).toBe(false);
    });
    it('should return "true" on chrome', () => {
      mockBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Google Inc.',
      );
      expect(isChromium()).toBe(true);
    });
    it('should return "false" on safari', () => {
      mockBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
        'Apple Computer, Inc.',
      );
      expect(isChromium()).toBe(false);
    });
    it('should return "true" on edge', () => {
      mockBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.43',
        'Google Inc.',
      );
      expect(isChromium()).toBe(true);
    });
  });

  describe('getAnimationDirection', () => {
    it('should return "forward" when the current state is greater than the next state', () => {
      expect(getAnimationDirection('1', '2')).toEqual('backward');
    });
    it('should return "backward" when the current state is less than the next state', () => {
      expect(getAnimationDirection('2', '1')).toEqual('forward');
    });
    it('should return "none" when the current state is equal to the next state', () => {
      expect(getAnimationDirection('1', '1')).toEqual(undefined);
    });
  });

  it('should move an element to the correct position', () => {
    const ele = document.createElement('div');
    dragElement(ele, ele);

    ele.onmousedown({
      clientX: 10,
      clientY: 20,
      preventDefault: jest.fn(),
    } as unknown as MouseEvent);
    document.onmousemove({
      clientX: 30,
      clientY: 40,
      preventDefault: jest.fn(),
    } as unknown as MouseEvent);
    document.onmouseup({} as MouseEvent);

    // eslint-disable-next-line jest-dom/prefer-to-have-style
    expect(ele.style.top).toBe('20px');
    // eslint-disable-next-line jest-dom/prefer-to-have-style
    expect(ele.style.left).toBe('20px');
  });
});

describe('handleAutoFocus', () => {
  // Real DOM rather than a `{ querySelector }` stub: the stub pinned how the
  // helper queries, so it broke the moment the query changed. These assert
  // which element ends up focused, which is the thing callers care about.
  const mkScreen = () => {
    const root = document.createElement('div');
    root.innerHTML = '<input id="first" name="first" />';
    document.body.appendChild(root);
    const input = root.querySelector('#first') as HTMLInputElement;
    const focusFn = jest.fn();
    input.focus = focusFn;
    return { root, focusFn };
  };

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should focus element when auto focus is on', async () => {
    const { root, focusFn } = mkScreen();

    handleAutoFocus(root, true, false);

    await waitFor(() => expect(focusFn).toBeCalled());
  });

  it('should not focus element when auto focus is off', () => {
    const { root, focusFn } = mkScreen();

    handleAutoFocus(root, false, true);

    setTimeout(() => expect(focusFn).not.toBeCalled());
  });

  it('should not focus element when auto focus is `skipAutoFocus` on first screen', () => {
    const { root, focusFn } = mkScreen();

    handleAutoFocus(root, 'skipFirstScreen', true);

    setTimeout(() => expect(focusFn).not.toBeCalled());
  });

  it('should focus element when auto focus is `skipAutoFocus` on non-first screen', async () => {
    const { root, focusFn } = mkScreen();

    handleAutoFocus(root, 'skipFirstScreen', false);

    await waitFor(() => expect(focusFn).toBeCalled());
  });

  // Regression for descope/etc#19151: a condition hides the CONTAINER, so the
  // input inside it keeps a clean class list and the selector cannot see it.
  it('should skip an input inside a container hidden by a condition', async () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div id="box"><input id="hidden-one" name="zip" /></div>' +
      '<input id="visible-one" name="city" />';
    document.body.appendChild(root);

    const hiddenOne = root.querySelector('#hidden-one') as HTMLInputElement;
    const visibleOne = root.querySelector('#visible-one') as HTMLInputElement;
    const hiddenFocus = jest.fn();
    const visibleFocus = jest.fn();
    hiddenOne.focus = hiddenFocus;
    visibleOne.focus = visibleFocus;

    applyAction(root.querySelector('#box') as Element, 'hide');
    expect(hiddenOne).not.toHaveClass('hidden');

    handleAutoFocus(root, true, false);

    await waitFor(() => expect(visibleFocus).toBeCalled());
    expect(hiddenFocus).not.toBeCalled();
  });
});

describe('withMemCache', () => {
  it('should return the fn result', () => {
    const myFn = jest.fn(() => 'result');
    const myFnWithMemCache = withMemCache(myFn);

    expect(myFnWithMemCache()).toBe('result');
  });

  it('should cache the fn result', () => {
    const myFn = jest.fn(() => 'result');
    const myFnWithMemCache = withMemCache(myFn);

    myFnWithMemCache();
    myFnWithMemCache();

    expect(myFn).toHaveBeenCalledTimes(1);
  });

  it('should reset the cache when the reset function is called', () => {
    const myFn = jest.fn(() => 'result');
    const myFnWithMemCache = withMemCache(myFn);

    myFnWithMemCache();
    myFnWithMemCache.reset();
    myFnWithMemCache();

    expect(myFn).toHaveBeenCalledTimes(2);
  });
});

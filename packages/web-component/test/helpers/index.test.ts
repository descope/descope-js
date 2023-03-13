import { URL_RUN_IDS_PARAM_NAME } from '../../src/lib/constants';
import { dragElement } from '../../src/lib/helpers';
import {
  clearRunIdsFromUrl,
  fetchContent,
  generateFnsFromScriptTags,
  getAnimationDirection,
  getRunIdsFromUrl,
  handleAutoFocus,
  setRunIdsOnUrl,
} from '../../src/lib/helpers/helpers';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('helpers', () => {
  describe('fetchContent', () => {
    it('should throw an error when got error response code', () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: false,
        })
      );

      expect(fetchContent('url', 'text')).rejects.toThrow();
    });
    it('should return the response text', () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: true,
          text: () => 'text',
          headers: new Headers({ h: '1' }),
        })
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
        })
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
    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=8_9`;
    expect(getRunIdsFromUrl()).toEqual({ executionId: '8', stepId: '9' });
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
      `http://localhost/?${URL_RUN_IDS_PARAM_NAME}=exec_step`
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

  describe('getAnimationDirection', () => {
    it('should return "forward" when the current state is greater than the next state', () => {
      expect(getAnimationDirection(1, 2)).toEqual('backward');
    });
    it('should return "backward" when the current state is less than the next state', () => {
      expect(getAnimationDirection(2, 1)).toEqual('forward');
    });
    it('should return "none" when the current state is equal to the next state', () => {
      expect(getAnimationDirection(1, 1)).toEqual(undefined);
    });
  });

  describe('generateFnsFromScriptTags', () => {
    it('should return array of functions with the script content when each function is bound the its previous element', () => {
      const elements = ['123', '456'].map((val) => {
        const span = document.createElement('span');
        span.innerText = val;

        const script = document.createElement('script');
        script.setAttribute('data-id', '1');
        Object.defineProperty(script, 'previousSibling', {
          value: span,
        });

        return script;
      });

      const script = document.createElement('script');
      script.setAttribute('id', '1');
      script.innerHTML = 'return this.innerText';

      jest
        .spyOn(document, 'querySelectorAll')
        .mockReturnValue(elements as unknown as NodeListOf<Element>);
      jest.spyOn(document, 'getElementById').mockReturnValue(script);

      const fns = generateFnsFromScriptTags(document as DocumentFragment);

      ['123', '456'].forEach((val, i) => expect(fns[i]()).toBe(val));
    });

    it('should bind the context to the function', () => {
      const elements = ['123', '456'].map((val) => {
        const span = document.createElement('span');
        span.innerText = val;

        const script = document.createElement('script');
        script.setAttribute('data-id', '1');
        Object.defineProperty(script, 'previousSibling', {
          value: span,
        });

        return script;
      });

      const script = document.createElement('script');
      script.setAttribute('id', '1');
      script.innerHTML = 'return arguments[0]';

      jest
        .spyOn(document, 'querySelectorAll')
        .mockReturnValue(elements as unknown as NodeListOf<Element>);
      jest.spyOn(document, 'getElementById').mockReturnValue(script);

      const context = { a: '1' };
      const fns = generateFnsFromScriptTags(
        document as DocumentFragment,
        context
      );

      ['123', '456'].forEach((val, i) => expect(fns[i]()).toBe(context));
    });

    it('should remove the script element that contains the script ref', () => {
      const elements = ['123', '456'].map((val) => {
        const span = document.createElement('span');
        span.innerText = val;

        const script = document.createElement('script');
        script.setAttribute('data-id', '1');
        Object.defineProperty(script, 'previousSibling', {
          value: span,
        });

        script.remove = jest.fn();

        return script;
      });

      jest
        .spyOn(document, 'querySelectorAll')
        .mockReturnValue(elements as unknown as NodeListOf<Element>);

      generateFnsFromScriptTags(document as DocumentFragment);

      elements.forEach((script) => expect(script.remove).toBeCalled());
    });
    it('should remove the scripts element with the actual scripts', () => {
      const scripts = document.createElement('scripts');
      scripts.remove = jest.fn();

      jest.spyOn(document, 'querySelector').mockReturnValue(scripts);

      generateFnsFromScriptTags(document as DocumentFragment);

      expect(scripts.remove).toHaveBeenCalled();
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
    it('should focus element when auto focus is on', () => {
      const focusFn = jest.fn();

      handleAutoFocus(
        {
          querySelector: () => ({ focus: focusFn }),
        } as never as HTMLElement,
        true,
        false
      );

      expect(focusFn).toBeCalled();
    });

    it('should not focus element when auto focus is off', () => {
      const focusFn = jest.fn();

      handleAutoFocus(
        {
          querySelector: () => ({ focus: focusFn }),
        } as never as HTMLElement,
        false,
        true
      );

      expect(focusFn).not.toBeCalled();
    });

    it('should not focus element when auto focus is `skipAutoFocus` on first screen', () => {
      const focusFn = jest.fn();

      handleAutoFocus(
        {
          querySelector: () => ({ focus: focusFn }),
        } as never as HTMLElement,
        'skipFirstScreen',
        true
      );

      expect(focusFn).not.toBeCalled();
    });

    it('should focus element when auto focus is `skipAutoFocus` on non-first screen', () => {
      const focusFn = jest.fn();

      handleAutoFocus(
        {
          querySelector: () => ({ focus: focusFn }),
        } as never as HTMLElement,
        'skipFirstScreen',
        false
      );

      expect(focusFn).toBeCalled();
    });
  });
});

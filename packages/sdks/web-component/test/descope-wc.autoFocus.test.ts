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
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';

describe('web-component auto-focus', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('Auto focus should not find hidden inputs (aria-hidden)', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent =
      '<input id="hidden-input" aria-hidden="true" name="hidden"></input><input id="email" name="email" placeholder="Email"></input><span>It works!</span>';

    const handleAutoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() =>
      expect(handleAutoFocusSpy).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        true,
        true,
      ),
    );

    const rootEle = handleAutoFocusSpy.mock.calls[0][0] as HTMLElement;

    const emailInput = rootEle.querySelector('#email');
    const hiddenInput = rootEle.querySelector('#hidden-input');

    const selectedElement = rootEle.querySelector(
      helpers.FOCUSABLE_INPUTS_SELECTOR,
    );

    expect(selectedElement).toBe(emailInput);
    expect(selectedElement).not.toBe(hiddenInput);

    // The harness teardown calls jest.resetAllMocks(), which strips this
    // spy's implementation instead of removing it. Without restoring here,
    // handleAutoFocus stays a no-op for every later test in this file.
    handleAutoFocusSpy.mockRestore();
  });

  // Regression for descope/etc#19151, autofocus half. A condition can hide the
  // CONTAINER holding the first input, which the selector cannot see.
  //
  // Spies on the prototype BEFORE render and records which element was
  // focused. Spying on the two elements after render is order-dependent: the
  // autofocus setTimeout has usually already fired by then, so the test passes
  // alone and fails in a full run.
  it('Auto focus skips an input inside a container hidden by a condition', async () => {
    const focused: string[] = [];
    const focusSpy = jest
      .spyOn(HTMLElement.prototype, 'focus')
      .mockImplementation(function focusMock(this: HTMLElement) {
        focused.push(this.id);
      });

    try {
      startMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsState: {
              'zip-box': 'hide',
            },
          },
        }),
      );

      fixtures.pageContent =
        '<div id="zip-box"><input id="zip" name="zip"></input></div><input id="city" name="city"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      const wc = document.querySelector('descope-wc');

      // The shape of the bug: the container is hidden, the input is not.
      expect(wc.shadowRoot.querySelector('#zip-box')).toHaveClass('hidden');
      expect(wc.shadowRoot.querySelector('#zip')).not.toHaveClass('hidden');

      jest.advanceTimersByTime(100);

      expect(focused).toContain('city');
      expect(focused).not.toContain('zip');
    } finally {
      focusSpy.mockRestore();
    }
  });

  // test is skipped due to test runner problems, but describes a real use case for the sdk's input selector, which covers `auto-focus="false"` as well.
  it.skip('Auto focus should not find inputs with auto-focus=false', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent =
      '<input id="hidden-input" auto-focus="false" name="hidden"></input><input id="email" name="email" placeholder="Email"></input><span>It works!</span>';

    const handleAutoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() =>
      expect(handleAutoFocusSpy).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        true,
        true,
      ),
    );

    const rootEle = handleAutoFocusSpy.mock.calls[0][0] as HTMLElement;

    const emailInput = rootEle.querySelector('#email');
    const hiddenInput = rootEle.querySelector('#hidden-input');

    const selectedElement = rootEle.querySelector(
      helpers.FOCUSABLE_INPUTS_SELECTOR,
    );

    expect(selectedElement).toBe(emailInput);
    expect(selectedElement).not.toBe(hiddenInput);
  });

  it('Auto focus input by default', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() =>
      expect(autoFocusSpy).toBeCalledWith(expect.any(HTMLElement), true, true),
    );
  });

  it('Auto focus should not happen when auto-focus is false', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc auto-focus="false" flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() =>
      expect(autoFocusSpy).toBeCalledWith(expect.any(HTMLElement), false, true),
    );
  });

  it('Auto focus should not happen when auto-focus is `skipFirstScreen`', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
    const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
    fixtures.pageContent =
      '<input id="email"></input><descope-button>click</descope-button><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc auto-focus="skipFirstScreen" flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() =>
      expect(autoFocusSpy).toBeCalledWith(
        expect.any(HTMLElement),
        'skipFirstScreen',
        true,
      ),
    );
    autoFocusSpy.mockClear();

    fireEvent.click(screen.getByShadowText('click'));
    await waitFor(
      () => {
        expect(autoFocusSpy).toBeCalledWith(
          expect.any(HTMLElement),
          'skipFirstScreen',
          false,
        );
      },
      { timeout: WAIT_TIMEOUT },
    );
  });
});

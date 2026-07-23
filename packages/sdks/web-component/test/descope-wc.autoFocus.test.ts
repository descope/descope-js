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

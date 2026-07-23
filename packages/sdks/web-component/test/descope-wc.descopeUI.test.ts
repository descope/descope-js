/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  scriptMock,
  orginalCreateElement,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import BaseDescopeWc from '../src/lib/descope-wc/BaseDescopeWc';
import { generateSdkResponse } from './testUtils';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('Descope UI', () => {
    beforeEach(() => {
      BaseDescopeWc.descopeUI = undefined;
      jest.spyOn(document, 'createElement').mockImplementation((element) => {
        if (element.toLowerCase() === 'script') {
          return scriptMock;
        }
        return orginalCreateElement.apply(document, [element]);
      });
    });
    it('should log error if Descope UI cannot be loaded', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

      globalThis.DescopeUI = undefined;

      const errorSpy = jest.spyOn(console, 'error');

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      await waitFor(
        () =>
          expect(
            document.querySelector(`script[id*="descope_web-components-ui"]`),
          ).toHaveAttribute('src', expect.stringContaining('https')),
        { timeout: WAIT_TIMEOUT },
      );

      document
        .querySelector('script[id*="descope_web-components-ui"]')
        .dispatchEvent(new Event('error'));

      await waitFor(
        () =>
          expect(errorSpy).toHaveBeenCalledWith(
            '[Descope]',
            expect.stringContaining('Cannot load script from URL'),
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });
    it('should try to load all descope component on the page', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      globalThis.DescopeUI = {
        'descope-button16': jest.fn(),
        'descope-input16': jest.fn(),
      };

      fixtures.pageContent =
        '<descope-input16 id="email"></descope-input16><descope-button16>It works!</descope-button16>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          Object.keys(globalThis.DescopeUI).forEach((key) =>
            expect(globalThis.DescopeUI[key]).toHaveBeenCalled(),
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });
    it('should log an error if descope component is missing', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      fixtures.pageContent =
        '<descope-button1 id="email"></descope-button1><span>It works!</span>';

      const errorSpy = jest.spyOn(console, 'error');

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(
        () =>
          expect(errorSpy).toHaveBeenCalledWith(
            '[Descope]',
            'Cannot load UI component "descope-button1"',
            expect.any(String),
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should call the ready cb when page is loaded', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      fixtures.pageContent =
        '<span>First Page</span><descope-button>click</descope-button>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const ready = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      wcEle.addEventListener('ready', ready);

      await waitFor(() => screen.getByShadowText('First Page'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => expect(ready).toBeCalledTimes(1), { timeout: 20000 });

      fixtures.pageContent = '<span>Second Page</span>';

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => screen.getByShadowText('Second Page'), {
        timeout: WAIT_TIMEOUT,
      });

      expect(ready).toBeCalledTimes(1);

      wcEle.removeEventListener('ready', ready);
    });
  });
});

/* eslint-disable max-classes-per-file */
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

import DescopeWc from '../src/lib/descope-wc';

describe('web-component errors', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('should call the error cb when API call returns error', async () => {
    fixtures.pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: false,
        requestErrorMessage: 'Not found',
        requestErrorDescription: 'Not found',
        requestErrorCode: '123',
      }),
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    const onError = jest.fn();
    wcEle.addEventListener('error', onError);

    await waitFor(
      () =>
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: {
              errorMessage: 'Not found',
              errorDescription: 'Not found',
              errorCode: '123',
            },
          }),
        ),
      { timeout: WAIT_TIMEOUT },
    );

    wcEle.removeEventListener('error', onError);
  });

  it('When getting E102004 error, and the components version remains the same, should restart the flow with the correct version', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({ requestErrorCode: 'E102004', ok: false }),
    );
    startMock.mockReturnValue(generateSdkResponse({}));

    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" restart-on-error="true"></descope-wc>`;

    const flattenConfigFlowVersions = (flows) =>
      Object.entries(flows).reduce(
        (acc, [key, val]) => ({ ...acc, [key]: val.version }),
        {},
      );

    await waitFor(() => expect(startMock).toBeCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'otpSignInEmail',
          expect.any(Object),
          undefined,
          '',
          '1.2.3',
          flattenConfigFlowVersions(fixtures.configContent.flows),
          {},
        ),
      { timeout: WAIT_TIMEOUT },
    );

    fixtures.configContent.flows.otpSignInEmail.version = 2;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    await waitFor(() => expect(startMock).toBeCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(
      () =>
        expect(startMock).toHaveBeenCalledWith(
          'otpSignInEmail',
          expect.any(Object),
          undefined,
          '',
          '1.2.3',
          flattenConfigFlowVersions(fixtures.configContent.flows),
          {},
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should throw an error project-id is missing', async () => {
    class Test extends DescopeWc {
      constructor() {
        super();
        Object.defineProperty(this, 'shadowRoot', {
          value: { isConnected: true, appendChild: () => {} },
        });
      }

      // eslint-disable-next-line class-methods-use-this
      public get flowId() {
        return '1';
      }
    }

    customElements.define('test-project-errors', Test as any);
    const descope: any = new Test();
    Object.defineProperty(descope.shadowRoot, 'host', {
      value: { closest: jest.fn() },
      writable: true,
    });

    await expect(descope.init.bind(descope)).rejects.toThrow(
      'project-id cannot be empty',
    );
  });

  it('should throw an error when flow-id is missing', async () => {
    class Test extends DescopeWc {
      constructor() {
        super();
        Object.defineProperty(this, 'shadowRoot', {
          value: { isConnected: true, appendChild: () => {} },
        });
      }

      // eslint-disable-next-line class-methods-use-this
      public get projectId() {
        return '1';
      }
    }
    customElements.define('test-flow-errors', Test as any);
    const descope: any = new Test();
    Object.defineProperty(descope.shadowRoot, 'host', {
      value: { closest: jest.fn() },
      writable: true,
    });

    await expect(descope.init.bind(descope)).rejects.toThrow(
      'flow-id cannot be empty',
    );
  });

  it('should handle a case where config request returns error response', async () => {
    const fn = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('config.json')) {
        return { ok: false };
      }
      return fn(url);
    });
    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const errorSpy = jest.spyOn(console, 'error');

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          '[Descope]',
          'Cannot get config file',
          'Make sure that your projectId & flowId are correct',
          expect.any(Error),
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });
});

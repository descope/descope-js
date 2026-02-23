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
  mockClientScript,
  mockPresentScript,
  mockRefreshScript,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { SDK_SCRIPTS_LOAD_TIMEOUT } from '../src/lib/constants';
import { generateSdkResponse } from './testUtils';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('clientScripts', () => {
    beforeEach(() => {
      jest.spyOn(document, 'createElement').mockImplementation((element) => {
        if (element.toLowerCase() === 'script') {
          return scriptMock;
        }
        return orginalCreateElement.apply(document, [element]);
      });
      window.descope = { grecaptcha: mockClientScript };
    });
    it('should run client script from config.json', async () => {
      fixtures.configContent = {
        flows: {
          'sign-in': {
            startScreenId: 'screen-0',
            clientScripts: [
              {
                id: 'grecaptcha',
                initArgs: {
                  enterprise: true,
                  siteKey: 'SITE_KEY',
                },
                resultKey: 'riskToken',
              },
            ],
          },
        },
      };
      fixtures.pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      scriptMock.onload();

      await waitFor(() =>
        expect(mockClientScript).toHaveBeenCalledWith(
          {
            enterprise: true,
            siteKey: 'SITE_KEY',
          },
          expect.any(Object),
          expect.any(Function),
          expect.any(Object),
        ),
      );
    });
    it('should run client script from client conditions', async () => {
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': {
            conditions: [
              {
                key: 'idpInitiated',
                met: {
                  interactionId: 'vhz8zebfaw',
                  screenId: 'recaptcha/SC2scMzI9OUnOEqJzEy3cg99U5f1t',
                },
                operator: 'is-true',
                predicate: '',
                unmet: {
                  clientScripts: [
                    {
                      id: 'grecaptcha',
                      initArgs: {
                        enterprise: true,
                        siteKey: 'SITE_KEY',
                      },
                      resultKey: 'riskToken',
                    },
                  ],
                  interactionId: 'ELSE',
                  screenId: 'recaptcha/SC2sJnbxyv3mFNePczbiDTL4AfuNN',
                },
              },
              {
                key: 'ELSE',
                met: {
                  clientScripts: [
                    {
                      id: 'grecaptcha',
                      initArgs: {
                        enterprise: true,
                        siteKey: 'SITE_KEY',
                      },
                      resultKey: 'riskToken',
                    },
                  ],
                  interactionId: 'ELSE',
                  screenId: 'recaptcha/SC2sJnbxyv3mFNePczbiDTL4AfuNN',
                },
                unmet: {},
              },
            ],
          },
        },
      };
      fixtures.pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });
      scriptMock.onload();

      await waitFor(() =>
        expect(mockClientScript).toHaveBeenCalledWith(
          {
            enterprise: true,
            siteKey: 'SITE_KEY',
          },
          expect.any(Object),
          expect.any(Function),
          expect.any(Object),
        ),
      );
    });
    describe('should run client script from sdk response', () => {
      beforeEach(async () => {
        mockPresentScript.mockClear();
        mockRefreshScript.mockClear();

        startMock.mockReturnValueOnce(
          generateSdkResponse({
            screenState: {
              clientScripts: [
                {
                  id: 'grecaptcha',
                  initArgs: {
                    enterprise: true,
                    siteKey: 'SITE_KEY',
                  },
                  resultKey: 'riskToken',
                },
              ],
            },
          }),
        );
        nextMock.mockReturnValueOnce(generateSdkResponse());

        fixtures.pageContent =
          '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

        document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

        await waitFor(() => screen.findByShadowText('hey'), {
          timeout: WAIT_TIMEOUT,
        });

        scriptMock.onload();
        await waitFor(() =>
          expect(mockClientScript).toHaveBeenCalledWith(
            {
              enterprise: true,
              siteKey: 'SITE_KEY',
            },
            expect.any(Object),
            expect.any(Function),
            expect.any(Object),
          ),
        );
      });
      it('should run client script perform and refresh', async () => {
        mockPresentScript.mockResolvedValueOnce(true);

        fireEvent.click(screen.getByShadowText('click'));

        await waitFor(() => expect(mockPresentScript).toHaveBeenCalled(), {
          timeout: WAIT_TIMEOUT,
        });

        await waitFor(() => expect(mockRefreshScript).toHaveBeenCalled(), {
          timeout: WAIT_TIMEOUT,
        });

        await waitFor(() => expect(nextMock).toHaveBeenCalled(), {
          timeout: WAIT_TIMEOUT,
        });
      });
    });
    it('should send the next request if timeout is reached', async () => {
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': {
            startScreenId: 'screen-0',
            clientScripts: [
              {
                id: 'grecaptcha',
                initArgs: {
                  enterprise: true,
                  siteKey: 'SITE_KEY',
                },
                resultKey: 'riskToken',
              },
            ],
          },
        },
      };
      fixtures.pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('hey'), {
        timeout: WAIT_TIMEOUT,
      });

      scriptMock.onload();
      await waitFor(() =>
        expect(mockClientScript).toHaveBeenCalledWith(
          {
            enterprise: true,
            siteKey: 'SITE_KEY',
          },
          expect.any(Object),
          expect.any(Function),
          expect.any(Object),
        ),
      );

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(startMock).not.toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(
        () =>
          expect(screen.getByShadowText('click')).toHaveAttribute(
            'loading',
            'true',
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      jest.advanceTimersByTime(SDK_SCRIPTS_LOAD_TIMEOUT + 1);

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      await waitFor(
        () =>
          expect(screen.getByShadowText('click')).toHaveAttribute('loading'),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('should load sdk script when flow configured with sdk script', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      const mockForterScript = jest.fn(() => ({
        id: 'forter',
        start: jest.fn(),
        stop: jest.fn(),
        refresh: jest.fn(),
        present: jest.fn(),
      }));
      window.descope = { forter: mockForterScript };
      const scriptId = 'forter';
      const resultKey = 'some-result-key';
      const resultValue = 'some-value';

      fixtures.configContent = {
        flows: {
          'sign-in': {
            startScreenId: 'screen-0',
            sdkScripts: [
              {
                id: scriptId,
                initArgs: {
                  siteId: 'some-site-id',
                },
                resultKey,
              },
            ],
          },
        },
      };

      fixtures.pageContent = `<descope-button type="button" id="interactionId">Click</descope-button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" base-cdn-url="https://localhost" base-url="http://base.url"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('Click'), {
        timeout: WAIT_TIMEOUT,
      });
      scriptMock.onload();

      await waitFor(() =>
        expect(mockForterScript).toHaveBeenCalledWith(
          {
            siteId: 'some-site-id',
          },
          expect.objectContaining({
            baseUrl: 'http://base.url',
          }),
          expect.any(Function),
          expect.any(Object),
        ),
      );

      const callback = (mockForterScript as jest.Mock).mock.calls[0][2];
      callback(resultValue);

      fireEvent.click(screen.getByShadowText('Click'));

      await waitFor(() => expect(startMock).toHaveBeenCalled());

      const startInput = startMock.mock.calls[0][6];
      expect(startInput).toEqual(
        expect.objectContaining({
          [`sdkScriptsResults.${scriptId}_${resultKey}`]: resultValue,
        }),
      );
    });
  });
});

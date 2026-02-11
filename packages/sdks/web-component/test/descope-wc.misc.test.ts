/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { generateSdkResponse } from './testUtils';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it(
    'There are no multiple calls to submit',
    async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      fixtures.pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));
      fireEvent.keyDown(screen.getByShadowText('click'), {
        key: 'Enter',
        code: 'Enter',
        charCode: 13,
      });

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1));
    },
    WAIT_TIMEOUT,
  );

  it('should call report validity on blur when validate-on-blur is set to true', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent =
      '<input name="email" id="email" placeholder="email"></input>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" validate-on-blur="true"></descope-wc>`;

    const emailInput = await waitFor(
      () => screen.getByShadowPlaceholderText('email'),
      {
        timeout: WAIT_TIMEOUT,
      },
    );

    (<HTMLInputElement>emailInput).reportValidity = jest.fn();

    await waitFor(() => {
      fireEvent.blur(emailInput);

      expect(
        (<HTMLInputElement>emailInput).reportValidity,
      ).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call report validity on blur by default', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent =
      '<input name="email" id="email" placeholder="email"></input>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    const emailInput = await waitFor(
      () => screen.getByShadowPlaceholderText('email'),
      {
        timeout: WAIT_TIMEOUT,
      },
    );

    (<HTMLInputElement>emailInput).reportValidity = jest.fn();

    fireEvent.blur(emailInput);

    await waitFor(() =>
      expect(
        (<HTMLInputElement>emailInput).reportValidity,
      ).not.toHaveBeenCalled(),
    );
  });

  it('Multiple buttons with auto-submit true, correct button is being called upon enter', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="submitterId" auto-submit="true" data-type="button">click</descope-button><descope-button id="submitterId2" data-type="button">click2</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'submitterId',
        1,
        '1.2.3',
        {
          email: '',
          origin: 'http://localhost',
        },
        false,
      ),
    );
  });

  describe('password managers', () => {
    it('should store password in password manager', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      Object.assign(navigator, { credentials: { store: jest.fn() } });
      globalThis.PasswordCredential = class {
        constructor(obj) {
          Object.assign(this, obj);
        }
      };
      fixtures.pageContent =
        '<descope-button id="submitterId">click</descope-button><input id="email" name="email" value="1@1.com"></input><input id="password" name="password" value="pass"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () =>
          expect(navigator.credentials.store).toHaveBeenCalledWith({
            id: '1@1.com',
            password: 'pass',
          }),
        { timeout: WAIT_TIMEOUT },
      );
    });
  });

  describe('componentsConfig', () => {
    it('should parse componentsConfig values to screen components', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsConfig: { customComponent: { value: 'val1' } },
          },
        }),
      );

      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="customComponent">`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => screen.getByShadowDisplayValue('val1'), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should parse componentsAttrs values to screen components after next', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValue(
        generateSdkResponse({
          screenState: {
            componentsConfig: {
              componentsDynamicAttrs: {
                "[data-connector-id='id123']": {
                  attributes: {
                    'test-attr': 'test-value',
                    'test-attr2': 2,
                  },
                },
                "[id='id456']": {
                  attributes: {
                    'test-attr': 'test-value3',
                  },
                },
              },
            },
          },
        }),
      );

      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input data-connector-id="id123" class="descope-input" placeholder="input1"></input><input id="id456" class="descope-input" placeholder="input2"></input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(
        () =>
          expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
            'test-attr',
            'test-value',
          ),
        { timeout: WAIT_TIMEOUT },
      );
      expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
        'test-attr2',
        '2',
      );
      expect(screen.getByShadowPlaceholderText('input2')).toHaveAttribute(
        'test-attr',
        'test-value3',
      );
      expect(screen.getByShadowPlaceholderText('input2')).not.toHaveAttribute(
        'test-attr2',
      );
    });

    it('should parse componentsAttrs values to screen components after start', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({
          screenState: {
            componentsConfig: {
              componentsDynamicAttrs: {
                "[placeholder='input1']": {
                  attributes: {
                    'test-attr': 'test-value',
                  },
                },
              },
            },
          },
        }),
      );

      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" placeholder="input1"></input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
            'test-attr',
            'test-value',
          ),
        { timeout: WAIT_TIMEOUT },
      );
    });

    it('should parse componentsAttrs values to screen components from config', async () => {
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': {
            startScreenId: 'screen-0',
            componentsConfig: {
              componentsDynamicAttrs: {
                "[id='id123']": {
                  attributes: {
                    'test-attr': 'test-value',
                  },
                },
              },
            },
          },
        },
      };
      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input id="id123" class="descope-input" placeholder="input1"></input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
            'test-attr',
            'test-value',
          ),
        { timeout: WAIT_TIMEOUT },
      );

      expect(startMock).not.toHaveBeenCalled();
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('should parse componentsAttrs values to screen components from config with condition', async () => {
      fixtures.configContent = {
        ...fixtures.configContent,
        flows: {
          'sign-in': {
            conditions: [
              {
                key: 'idpInitiated',
                met: {
                  interactionId: 'vhz8zebfaw',
                  screenId: 'met',
                },
                operator: 'is-true',
                predicate: '',
              },
              {
                key: 'ELSE',
                met: {
                  componentsConfig: {
                    componentsDynamicAttrs: {
                      "[id='id123']": {
                        attributes: {
                          'test-attr': 'test-value',
                        },
                      },
                    },
                  },
                  interactionId: 'ELSE',
                  screenId: 'unmet',
                },
                unmet: {},
              },
            ],
          },
        },
      };

      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input id="id123" class="descope-input" placeholder="input1"></input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowPlaceholderText('input1')).toHaveAttribute(
            'test-attr',
            'test-value',
          ),
        { timeout: WAIT_TIMEOUT },
      );

      expect(startMock).not.toHaveBeenCalled();
    });
  });

  describe('cssVars', () => {
    it('should set css vars on root element', async () => {
      const spyGet = jest.spyOn(customElements, 'get');
      spyGet.mockReturnValue({ cssVarList: { varName: '--var-name' } } as any);

      startMock.mockReturnValueOnce(
        generateSdkResponse({
          screenState: {
            cssVars: { 'descope-button': { varName: 'value' } },
          },
        }),
      );

      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="customComponent">`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      const shadowEle =
        document.getElementsByTagName('descope-wc')[0].shadowRoot;
      const rootEle = shadowEle.querySelector('#content-root');

      await waitFor(
        () =>
          expect(rootEle).toHaveStyle({
            '--var-name': 'value',
          }),
        { timeout: 20000 },
      );
    });
  });

  describe('Input Flows', () => {
    it('should pre-populate input with flat structure config structure', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="kuku"/>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc form='{"kuku":"123"}' flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowDisplayValue('123'), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should pre-populate input with nested config structure', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="kuku"/>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc form='{"kuku":{"value":"456"}}' flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowDisplayValue('456'), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('should disable pre-populated input', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="kuku"/>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc form='{"kuku":{"value":"123", "disabled":"true"}}' flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowDisplayValue('123')).toHaveAttribute(
            'disabled',
            'true',
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });

    it('should pre-populate and disable input with combined nested/flat config structure', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="kuku"/><input class="descope-input" name="email"/>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc form='{"kuku":{"value":"456", "disabled":"true"}, "email": "my@email.com"}' flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(() => screen.getByShadowDisplayValue('456'), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () =>
          expect(screen.getByShadowDisplayValue('456')).toHaveAttribute(
            'disabled',
            'true',
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );
    });
  });

  it('should update page href attribute according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } }),
    );

    fixtures.pageContent = `<div>Loaded123</div><descope-link class="descope-link" href="{{user.name}}">ho!</descope-link>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded123'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() =>
      expect(screen.getByShadowText('ho!')).toHaveAttribute('href', 'john'),
    );
  });

  it('When WC loads it injects the correct content', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('should update the page when props are changed', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    startMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    fixtures.pageContent = '<input id="email"></input><span>It updated!</span>';

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    wcEle.setAttribute('project-id', '2');

    await waitFor(() => screen.findByShadowText('It updated!'), {
      timeout: WAIT_TIMEOUT,
    });
  });
});

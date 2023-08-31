// eslint-disable-next-line max-classes-per-file
import createSdk from '@descope/web-js-sdk';
import { fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { screen } from 'shadow-dom-testing-library';
import {
  ASSETS_FOLDER,
  CONFIG_FILENAME,
  CUSTOM_INTERACTIONS,
  DESCOPE_ATTRIBUTE_PREFIX,
  DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
  ELEMENT_TYPE_ATTRIBUTE,
  RESPONSE_ACTIONS,
  THEME_FILENAME,
  URL_CODE_PARAM_NAME,
  URL_ERR_PARAM_NAME,
  URL_RUN_IDS_PARAM_NAME,
  URL_TOKEN_PARAM_NAME,
  URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME,
  URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME,
  URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME,
  OIDC_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_USERNAME_PARAM_NAME,
  SSO_APP_ID_PARAM_NAME,
} from '../src/lib/constants';
import DescopeWc from '../src/lib/descope-wc';
// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';
// eslint-disable-next-line import/no-namespace
import { generateSdkResponse } from './testUtils';

jest.mock('@descope/web-js-sdk');

class MockFileReader {
  onload = null;

  readAsDataURL() {
    if (this.onload) {
      this.onload({
        target: {
          result: 'data:;base64,example',
        },
      });
    }
  }
}

const sdk = {
  flow: {
    start: jest.fn().mockName('flow.start'),
    next: jest.fn().mockName('flow.next'),
  },
  webauthn: {
    helpers: {
      isSupported: jest.fn(),
      conditional: jest.fn(() => Promise.resolve()),
      create: jest.fn(),
      get: jest.fn(),
    },
  },
  getLastUserLoginId: jest.fn().mockName('getLastUserLoginId'),
  getLastUserDisplayName: jest.fn().mockName('getLastUserDisplayName'),
};

const nextMock = sdk.flow.next as jest.Mock;
const startMock = sdk.flow.start as jest.Mock;
const isWebauthnSupportedMock = sdk.webauthn.helpers.isSupported as jest.Mock;
const getLastUserLoginIdMock = sdk.getLastUserLoginId as jest.Mock;
const getLastUserDisplayNameMock = sdk.getLastUserDisplayName as jest.Mock;

// this is for mocking the pages/theme/config
let themeContent = '';
let pageContent = '';
let configContent = {};

class TestClass {}

const fetchMock: jest.Mock = jest.fn();
global.fetch = fetchMock;

Object.defineProperty(window, 'location', {
  value: new URL(window.location.origin),
});
window.location.assign = jest.fn();

Object.defineProperty(window, 'PublicKeyCredential', { value: TestClass });

Object.defineProperty(window.history, 'pushState', {
  value: (x: any, y: any, url: string) => {
    window.location.href = url;
  },
});
Object.defineProperty(window.history, 'replaceState', {
  value: (x: any, y: any, url: string) => {
    window.location.href = url;
  },
});

const isChromiumSpy = jest.spyOn(helpers, 'isChromium');

describe('web-component', () => {
  beforeEach(() => {
    configContent = {
      flows: {
        'versioned-flow': { version: 1 },
        otpSignInEmail: { version: 1 },
      },
    };
    jest.useFakeTimers();

    fetchMock.mockImplementation((url: string) => {
      const res = {
        ok: true,
        headers: new Headers({ 'x-geo': 'XX' }),
      };

      switch (true) {
        case url.endsWith('theme.css'): {
          return { ...res, text: () => themeContent };
        }
        case url.endsWith('.html'): {
          return { ...res, text: () => pageContent };
        }
        case url.endsWith('config.json'): {
          return { ...res, json: () => configContent };
        }
        default: {
          return { ok: false };
        }
      }
    });
    (createSdk as jest.Mock).mockReturnValue(sdk);
  });

  afterEach(() => {
    document.getElementsByTagName('head')[0].innerHTML = '';
    document.getElementsByTagName('body')[0].innerHTML = '';
    jest.resetAllMocks();
    window.location.search = '';
    themeContent = '';
    pageContent = '';
  });

  it('should call the success cb when flow in completed status', async () => {
    pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: true,
        status: 'completed',
      })
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id=1></descope-wc>`;

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    const onSuccess = jest.fn();

    wcEle.addEventListener('success', onSuccess);

    await waitFor(
      () =>
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ detail: 'auth info' })
        ),
      { timeout: 1000 }
    );

    wcEle.removeEventListener('success', onSuccess);
  });

  it('should clear the flow query params after render', async () => {
    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_1&code=123456`;
    nextMock.mockReturnValue(generateSdkResponse({}));

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 3000,
    });

    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('should call the error cb when API call returns error', async () => {
    pageContent = '<input id="email" name="email"></input>';

    startMock.mockReturnValue(
      generateSdkResponse({
        ok: false,
        requestErrorMessage: 'Not found',
        requestErrorDescription: 'Not found',
      })
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
            },
          })
        ),
      { timeout: 1000 }
    );

    wcEle.removeEventListener('error', onError);
  });

  it('When WC loads it injects the correct content', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await screen.findByShadowText('It works!');
  });

  it('When WC loads it injects the theme', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';
    themeContent = 'button { color: red; }';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    await screen.findByShadowText('It works!');

    const themeStyleEle = shadowEle?.querySelector(
      'style:last-child'
    ) as HTMLStyleElement;
    expect(themeStyleEle.innerText).toContain(themeContent);
  });

  it('should log the script error when throws', async () => {
    const errorSpy = jest.spyOn(console, 'error');
    startMock.mockReturnValue(generateSdkResponse());

    pageContent =
      '<input id="email"></input><script data-id="123"></script><span>It works!</span><scripts><script id="123">throw Error("script error!")</script></scripts>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await screen.findByShadowText('It works!');

    expect(errorSpy).toHaveBeenCalledWith(
      'script error!',
      '',
      expect.any(Error)
    );
  });

  it('should call the generateFnsFromScriptTags with the correct context', async () => {
    const generateSpy = jest.spyOn(helpers, 'generateFnsFromScriptTags');
    startMock.mockReturnValue(generateSdkResponse());

    pageContent =
      '<input id="email"></input><script data-id="123"></script><span>It works!</span><scripts><script id="123">throw Error("script error!")</script></scripts>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await screen.findByShadowText('It works!');

    expect(generateSpy).toHaveBeenCalledWith(expect.any(DocumentFragment), {
      geo: 'XX',
    });
  });

  it('Auto focus input by default', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await screen.findByShadowText('It works!');
    expect(autoFocusSpy).toBeCalledWith(expect.any(HTMLElement), true, true);
  });

  it('Auto focus should not happen when auto-focus is false', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc auto-focus="false" flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await screen.findByShadowText('It works!');
    expect(autoFocusSpy).toBeCalledWith(expect.any(HTMLElement), false, true);
  });

  it('Auto focus should not happen when auto-focus is `skipFirstScreen`', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
    const autoFocusSpy = jest.spyOn(helpers, 'handleAutoFocus');
    pageContent =
      '<input id="email"></input><button>click</button><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc auto-focus="skipFirstScreen" flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await screen.findByShadowText('It works!');
    expect(autoFocusSpy).toBeCalledWith(
      expect.any(HTMLElement),
      'skipFirstScreen',
      true
    );
    autoFocusSpy.mockClear();

    fireEvent.click(screen.getByShadowText('click'));
    await waitFor(() => {
      expect(autoFocusSpy).toBeCalledWith(
        expect.any(HTMLElement),
        'skipFirstScreen',
        false
      );
    });
  });

  it('should fetch the data from the correct path', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    await screen.findByShadowText('It works!');

    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
    const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_FILENAME}`;
    const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
    const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
    const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object)
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(themeUrlPathRegex),
      expect.any(Object)
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(configUrlPathRegex),
      expect.any(Object)
    );
  });

  it('should throw an error project-id is missing', async () => {
    class Test extends DescopeWc {
      constructor() {
        super();
        Object.defineProperty(this, 'shadowRoot', {
          value: { isConnected: true },
        });
      }

      // eslint-disable-next-line class-methods-use-this
      public get flowId() {
        return '1';
      }
    }

    customElements.define('test-project', Test);
    const descope = new Test();
    Object.defineProperty(descope.shadowRoot, 'host', {
      value: { closest: jest.fn() },
      writable: true,
    });

    await expect(descope.connectedCallback.bind(descope)).rejects.toThrow(
      'project-id cannot be empty'
    );
  });

  it('should throw an error when flow-id is missing', async () => {
    class Test extends DescopeWc {
      constructor() {
        super();
        Object.defineProperty(this, 'shadowRoot', {
          value: { isConnected: true },
        });
      }

      // eslint-disable-next-line class-methods-use-this
      public get projectId() {
        return '1';
      }
    }
    customElements.define('test-flow', Test);
    const descope = new Test();
    Object.defineProperty(descope.shadowRoot, 'host', {
      value: { closest: jest.fn() },
      writable: true,
    });

    await expect(descope.connectedCallback.bind(descope)).rejects.toThrow(
      'flow-id cannot be empty'
    );
  });

  it('should update the page when props are changed', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    startMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    await screen.findByShadowText('It works!');

    pageContent = '<input id="email"></input><span>It updated!</span>';

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    wcEle.setAttribute('project-id', '2');

    await screen.findByShadowText('It updated!');
  });

  it('When submitting it injects the next page to the website', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<button>click</button><input id="email"></input><input id="code"></input><span>Loaded</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await screen.findByShadowText('Loaded');

    pageContent =
      '<input id="email"></input><input id="code"></input><span>It works!</span>';

    fireEvent.click(screen.getByShadowText('click'));

    await screen.findByShadowText('It works!');

    expect(startMock).toBeCalledTimes(1);
    expect(nextMock).toBeCalledTimes(1);
  });

  it('When submitting it calls next with the button id', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<button id="submitterId">click</button><input id="email" class="descope-input" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await screen.findByShadowText('It works!');

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith('0', '0', 'submitterId', {
        email: '',
        origin: 'http://localhost',
      })
    );
  });

  it('When submitting it calls next with the checkbox checked value - false', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<button id="submitterId">click</button><input id="toggle" class="descope-input" name="t1" type="checkbox"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-up-or-in" project-id="1"></descope-wc>`;

    await screen.findByShadowText('It works!');

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith('0', '0', 'submitterId', {
        t1: false,
        origin: 'http://localhost',
      })
    );
  });

  it('When submitting it calls next with the checkbox checked value - true', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<button id="submitterId">click</button><input id="toggle" name="t1" class="descope-input" type="checkbox" checked="true"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await screen.findByShadowText('It works!');

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith('0', '0', 'submitterId', {
        t1: true,
        origin: 'http://localhost',
      })
    );
  });

  it('When submitting and no execution id - it calls start with the button id and token if exists', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };
    const token = 'token1';
    window.location.search = `?&${URL_TOKEN_PARAM_NAME}=${token}`;
    pageContent =
      '<button id="submitterId">click</button><input id="email" class="descope-input" name="email"></input><span>hey</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" redirect-url="http://custom.url"></descope-wc>`;

    await screen.findByShadowText('hey');

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        {
          lastAuth: {},
          redirectUrl: 'http://custom.url',
          oidcIdpStateId: null,
          samlIdpStateId: null,
          samlIdpUsername: null,
          ssoAppId: null,
          redirectAuth: undefined,
          tenant: undefined,
        },
        undefined,
        'submitterId',
        {
          email: '',
          origin: 'http://localhost',
          token,
        },
        0
      )
    );
  });

  it('When there is a single button and pressing on enter, it clicks the button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<button id="buttonId">Click</button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), { timeout: 3000 });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#wc-root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).toHaveBeenCalled());
  });

  it('When there is a single "generic" button and pressing on enter, it clicks the button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<button id="noClick">No Click</button><button id="click" data-type="button">Click</button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), { timeout: 3000 });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#wc-root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'click',
        expect.any(Object)
      )
    );
  });

  it('When there are multiple "generic" buttons and pressing on enter, it does not click any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<button id="1" data-type="button">Click</button><button id="2" data-type="button">Click</button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 3000,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#wc-root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('When there are multiple button and pressing on enter, it does not clicks any button', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent =
      '<button id="buttonId">Click</button><button id="buttonId1">Click2</button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 3000,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#wc-root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).not.toHaveBeenCalled());
  });

  it('should update the page messages when page is remaining the same but the state is updated', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(
      generateSdkResponse({ screenState: { errorText: 'Error!' } })
    );

    pageContent = `<button>click</button><div>Loaded1</div><span ${ELEMENT_TYPE_ATTRIBUTE}="error-message">xxx</span>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), { timeout: 3000 });

    pageContent = `<div>Loaded2</div><span ${ELEMENT_TYPE_ATTRIBUTE}="error-message">xxx</span>`;

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(
      () =>
        screen.getByShadowText('Error!', {
          selector: `[${ELEMENT_TYPE_ATTRIBUTE}="error-message"]`,
        }),
      { timeout: 3000 }
    );
  });

  it('should update page inputs according to screen state', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(
      generateSdkResponse({ screenState: { inputs: { email: 'email1' } } })
    );

    pageContent = `<button>click</button><div>Loaded</div><input class="descope-input" name="email">`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded'), { timeout: 3000 });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => screen.getByShadowDisplayValue('email1'), {
      timeout: 3000,
    });
  });

  it('should upload file', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse());

    // Use the mock FileReader in your tests.
    (global as any).FileReader = MockFileReader;

    pageContent = `<button>click</button><div>Loaded</div><input class="descope-input" name="image" type="file" placeholder="image-ph">`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded'), { timeout: 3000 });

    // fill the input with a file
    const input = screen.getByShadowPlaceholderText('image-ph');
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await fireEvent.click(screen.getByShadowText('click'));

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', null, {
          image: 'data:;base64,example',
          origin: 'http://localhost',
        }),
      { timeout: 3000 }
    );
  });

  it('should go next with no file', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse());

    // Use the mock FileReader in your tests.
    (global as any).FileReader = MockFileReader;

    pageContent = `<button>click</button><div>Loaded</div><input class="descope-input" name="image" type="file" placeholder="image-ph">`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded'), { timeout: 3000 });

    await fireEvent.click(screen.getByShadowText('click'));

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith('0', '0', null, {
          image: null,
          origin: 'http://localhost',
        }),
      { timeout: 3000 }
    );
  });

  it('should update page templates according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } })
    );

    pageContent = `<div>Loaded1</div><span class="descope-text">hey {{user.name}}!</span>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), { timeout: 3000 });
    await waitFor(() => screen.getByShadowText('hey john!'));
  });

  it('should update page templates according to last auth login ID when there is only login Id', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } })
    );
    getLastUserLoginIdMock.mockReturnValue('not john');

    pageContent = `<div>Loaded1</div><span class="descope-text">hey {{lastAuth.loginId}}!</span>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), { timeout: 3000 });
    await waitFor(() => screen.getByShadowText('hey not john!'));
  });

  it('should update page templates according to last auth name when there is only login Id', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } })
    );
    getLastUserLoginIdMock.mockReturnValue('not john');

    pageContent = `<div>Loaded1</div><span class="descope-text">hey {{lastAuth.name}}!</span>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), { timeout: 3000 });
    await waitFor(() => screen.getByShadowText('hey not john!'));
  });

  it('should update page templates according to last auth name when there is login Id and name', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } })
    );
    getLastUserLoginIdMock.mockReturnValue('not john');
    getLastUserDisplayNameMock.mockReturnValue('Niros!');

    pageContent = `<div>Loaded1</div><span class="descope-text">hey {{lastAuth.name}}!</span>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), { timeout: 3000 });
    await waitFor(() => screen.getByShadowText('hey Niros!!'));
  });

  it('should update totp link href according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { totp: { provisionUrl: 'url1' } } })
    );

    pageContent = `<div>Loaded1</div><a data-type="totp-link">Provision URL</a>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), { timeout: 3000 });
    await waitFor(() => screen.getByShadowText('Provision URL'));

    const totpLink = screen.getByShadowText('Provision URL');
    expect(totpLink).toHaveAttribute('href', 'url1');
  });

  it('should disable webauthn buttons when its not supported in the browser', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    isWebauthnSupportedMock.mockReturnValue(false);

    pageContent = `<div>Loaded1</div><button data-type="biometrics">Webauthn</button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), { timeout: 3000 });

    const btn = screen.getByShadowText('Webauthn');
    expect(btn).toHaveAttribute('disabled', 'true');
  });

  it('should update root css var according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { totp: { image: 'base-64-text' } } })
    );

    pageContent = `<div>Loaded1</div>"/>`;

    document.body.innerHTML = `<h1>Custom element test</h1><descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), { timeout: 3000 });

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle.querySelector('#wc-root');
    await waitFor(() =>
      expect(rootEle.querySelector('div')).toHaveStyle({
        '--totp-image': 'url(data:image/jpg;base64,base-64-text)',
      })
    );
  });

  it('should update the page when user changes the url query param value', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<input id="email" name="email"></input>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    fetchMock.mockReturnValue({
      text: () =>
        '<input id="email"></input><input id="code"></input><span>It updated!</span>',
      ok: true,
    });

    const logSpy = jest.spyOn(console, 'warn');

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_1`;

    fireEvent.popState(window);

    await waitFor(() =>
      expect(logSpy).toHaveBeenCalledWith('No screen was found to show', '')
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
    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const errorSpy = jest.spyOn(console, 'error');

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          'Cannot get config file',
          'make sure that your projectId & flowId are correct',
          expect.any(Error)
        ),
      { timeout: 3000 }
    );
  });

  it('should update the page when user clicks on back', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 3000,
    });

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_1`;

    pageContent = '<input id="email"></input><span>It updated!</span>';

    fireEvent.popState(window);

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;
    const rootEle = shadowEle.querySelector('#wc-root');
    const spyAddEventListener = jest.spyOn(rootEle, 'addEventListener');

    spyAddEventListener.mockImplementationOnce(
      (_, cb) => typeof cb === 'function' && cb({} as Event)
    );

    await waitFor(() => screen.findByShadowText('It updated!'), {
      timeout: 3000,
    });
  });

  it('should call next with token when url contains "t" query param', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_TOKEN_PARAM_NAME}=token1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'submit',
        {
          token: 'token1',
        },
        1
      )
    );
    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 3000,
    });
  });

  it('should call next with token when url contains "code" query param', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="flow-1" project-id="1"></descope-wc>`;

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'submit',
        {
          exchangeCode: 'code1',
        },
        0
      )
    );
    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 3000,
    });
  });

  it('should call next with exchangeError when url contains "err" query param', async () => {
    nextMock.mockReturnValueOnce(generateSdkResponse());

    pageContent = '<span>It works!</span>';

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_ERR_PARAM_NAME}=err1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'submit',
        {
          exchangeError: 'err1',
        },
        1
      )
    );
    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 3000,
    });
  });

  it('When clicking a button it should collect all the descope attributes and call next with it', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    pageContent = `<button type="button" id="123" ${DESCOPE_ATTRIBUTE_PREFIX}attr1='attr1' ${DESCOPE_ATTRIBUTE_PREFIX}attr2='attr2'>Click</button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Click'), { timeout: 5000 });

    pageContent =
      '<input id="email"></input><input id="code"></input><span>It works!</span>';

    fireEvent.click(screen.getByShadowText('Click'));

    await waitFor(() =>
      expect(nextMock).toBeCalledWith('0', '0', '123', {
        attr1: 'attr1',
        attr2: 'attr2',
        origin: 'http://localhost',
      })
    );
  });

  it('Submitter button should have a loading class when next is pending', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    let resolve: Function;
    nextMock.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolve = res;
        })
    );

    pageContent = `<button type="button" id="123" ${DESCOPE_ATTRIBUTE_PREFIX}attr1='attr1' ${DESCOPE_ATTRIBUTE_PREFIX}attr2='attr2'>Click</button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Click'), { timeout: 4000 });

    fireEvent.click(screen.getByShadowText('Click'));

    await waitFor(() =>
      expect(screen.getByShadowText('Click')).toHaveClass('loading')
    );

    resolve(generateSdkResponse({ screenId: '1' }));

    await waitFor(
      () => expect(screen.getByShadowText('Click')).not.toHaveClass('loading'),
      { timeout: 3000 }
    );
  });

  it('When action type is "redirect" it navigates to the "redirectUrl" that is received from the server', async () => {
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: 'https://myurl.com',
      })
    );

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(window.location.assign).toHaveBeenCalledWith(
          'https://myurl.com'
        ),
      {
        timeout: 2000,
      }
    );
  });

  it('When action type is "redirect" it calls location.assign one time only', async () => {
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: 'https://myurl.com',
      })
    );

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () => expect(window.location.assign).toHaveBeenCalledTimes(1),
      {
        timeout: 5000,
      }
    );
  });

  it('When action type is "redirect" and redirectUrl is missing should log an error ', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
      })
    );

    const errorSpy = jest.spyOn(console, 'error');

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          'Did not get redirect url',
          '',
          expect.any(Error)
        ),
      { timeout: 3000 }
    );
  });

  it('When action type is "redirect" and redirect auth initiator is android navigates to the "redirectUrl" only in foreground', async () => {
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: 'https://myurl.com',
      })
    );

    // Start hidden (in background)
    let isHidden = true;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get() {
        return isHidden;
      },
    });

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1&${URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME}=android`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    // Make sure no redirect happened
    await waitFor(() => expect(nextMock).toHaveBeenCalled(), { timeout: 2000 });
    expect(window.location.assign).not.toHaveBeenCalledWith(
      'https://myurl.com'
    );

    // Back to the foreground
    isHidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(
      () =>
        expect(window.location.assign).toHaveBeenCalledWith(
          'https://myurl.com'
        ),
      {
        timeout: 2000,
      }
    );
  });

  it('When action type is "redirect" and redirect auth initiator is not android navigates to the "redirectUrl" even in background', async () => {
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.redirect,
        redirectUrl: 'https://myurl.com',
      })
    );

    // Start hidden (in background)
    const isHidden = true;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get() {
        return isHidden;
      },
    });

    window.location.search = `?${URL_RUN_IDS_PARAM_NAME}=0_0&${URL_CODE_PARAM_NAME}=code1`;
    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    // Make sure no redirect happened
    await waitFor(() => expect(nextMock).toHaveBeenCalled(), { timeout: 2000 });
    await waitFor(
      () =>
        expect(window.location.assign).toHaveBeenCalledWith(
          'https://myurl.com'
        ),
      {
        timeout: 2000,
      }
    );
  });

  it('When action type is "webauthnCreate" and webauthnTransactionId is missing should log an error ', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnCreate,
      })
    );

    const errorSpy = jest.spyOn(console, 'error');

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(errorSpy).toHaveBeenCalledWith(
          'Did not get webauthn transaction id or options',
          '',
          expect.any(Error)
        ),
      { timeout: 3000 }
    );
  });

  it('Should create new credentials when action type is "webauthnCreate"', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnCreate,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      })
    );
    pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.create.mockReturnValueOnce(
      Promise.resolve('webauthn-response')
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="webauthn_signup" project-id="1"></descope-wc>`;

    await waitFor(
      () => expect(sdk.webauthn.helpers.create).toHaveBeenCalled(),
      { timeout: 3000 }
    );
    expect(nextMock).toHaveBeenCalledWith(
      '0',
      '0',
      'submit',
      {
        transactionId: 't1',
        response: 'webauthn-response',
      },
      0
    );
  });

  it('Should create new credentials on platform only in Chrome when action type is "webauthnCreate"', async () => {
    const initialOptions = '{"publicKey":{}}';
    const expectedOptions =
      '{"publicKey":{"authenticatorSelection":{"authenticatorAttachment":"platform"}}}';

    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnCreate,
        webAuthnTransactionId: 't1',
        webAuthnOptions: initialOptions,
      })
    );
    pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.create.mockReturnValueOnce(
      Promise.resolve('webauthn-response')
    );

    isChromiumSpy.mockReturnValue(true);
    const pkc = <any>window.PublicKeyCredential;
    pkc.isUserVerifyingPlatformAuthenticatorAvailable = () => true;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="webauthn_signup" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(sdk.webauthn.helpers.create).toHaveBeenCalledWith(
          expectedOptions
        ),
      { timeout: 3000 }
    );
    expect(nextMock).toHaveBeenCalledWith(
      '0',
      '0',
      'submit',
      {
        transactionId: 't1',
        response: 'webauthn-response',
      },
      0
    );
  });

  it('Should create new credentials without platform flag in Chrome when action type is "webauthnCreate" and prefer-biometrics is false', async () => {
    const initialOptions = '{"publicKey":{}}';

    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnCreate,
        webAuthnTransactionId: 't1',
        webAuthnOptions: initialOptions,
      })
    );
    pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.create.mockReturnValueOnce(
      Promise.resolve('webauthn-response')
    );

    isChromiumSpy.mockReturnValue(true);
    const pkc = <any>window.PublicKeyCredential;
    pkc.isUserVerifyingPlatformAuthenticatorAvailable = () => true;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="webauthn_signup" prefer-biometrics="false" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(sdk.webauthn.helpers.create).toHaveBeenCalledWith(
          initialOptions
        ),
      { timeout: 3000 }
    );
    expect(nextMock).toHaveBeenCalledWith(
      '0',
      '0',
      'submit',
      {
        transactionId: 't1',
        response: 'webauthn-response',
      },
      0
    );
  });

  it('Should not fail to create new credentials if options cannot be parsed when action type is "webauthnCreate"', async () => {
    const initialOptions = '{"publicKey:{}}';

    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnCreate,
        webAuthnTransactionId: 't1',
        webAuthnOptions: initialOptions,
      })
    );
    pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.create.mockReturnValueOnce(
      Promise.resolve('webauthn-response')
    );

    isChromiumSpy.mockReturnValue(true);
    const pkc = <any>window.PublicKeyCredential;
    pkc.isUserVerifyingPlatformAuthenticatorAvailable = () => true;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="webauthn_signup" project-id="1"></descope-wc>`;

    await waitFor(
      () =>
        expect(sdk.webauthn.helpers.create).toHaveBeenCalledWith(
          initialOptions
        ),
      { timeout: 3000 }
    );
    expect(nextMock).toHaveBeenCalledWith(
      '0',
      '0',
      'submit',
      {
        transactionId: 't1',
        response: 'webauthn-response',
      },
      0
    );
  });

  it('Should search of existing credentials when action type is "webauthnGet"', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnGet,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      })
    );

    pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.get.mockReturnValueOnce(
      Promise.resolve('webauthn-response-get')
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

    await waitFor(() => expect(sdk.webauthn.helpers.get).toHaveBeenCalled(), {
      timeout: 3000,
    });
    expect(nextMock).toHaveBeenCalledWith(
      '0',
      '0',
      'submit',
      {
        transactionId: 't1',
        response: 'webauthn-response-get',
      },
      1
    );
  });

  it('Should handle canceling webauthn', async () => {
    startMock.mockReturnValueOnce(
      generateSdkResponse({
        action: RESPONSE_ACTIONS.webauthnGet,
        webAuthnTransactionId: 't1',
        webAuthnOptions: 'options',
      })
    );

    pageContent = '<span>It works!</span>';

    nextMock.mockReturnValueOnce(generateSdkResponse());

    sdk.webauthn.helpers.get.mockReturnValueOnce(
      Promise.reject(new DOMException('', 'NotAllowedError'))
    );

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="webauthn_signup" project-id="1"></descope-wc>`;

    await waitFor(() => expect(sdk.webauthn.helpers.get).toHaveBeenCalled(), {
      timeout: 3000,
    });
    expect(nextMock).toHaveBeenCalledWith(
      '0',
      '0',
      'submit',
      {
        transactionId: 't1',
        cancelWebauthn: true,
      },
      0
    );
  });

  it('it loads the fonts from the config when loading', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    configContent = {
      cssTemplate: {
        light: { typography: { fontFamilies: [{ url: 'font.url' }] } },
      },
    };

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() =>
      expect(
        document.head.querySelector(`link[href="font.url"]`)
      ).toBeInTheDocument()
    );
  });

  it('loads flow start screen if its in config file', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    configContent = {
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'));
    expect(startMock).not.toBeCalled();
    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/screen-0.html`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object)
    );
  });

  it('it should set the theme based on the user parameter', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="light"></descope-wc>`;

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle?.querySelector('#wc-root');

    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'light'));
  });

  it('it should set the theme based on OS settings when theme is "os"', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    window.matchMedia = jest.fn(() => ({ matches: true })) as any;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1" theme="os"></descope-wc>`;

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle?.querySelector('#wc-root');

    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'dark'));
  });

  it('it should set the theme to light if not provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    window.matchMedia = jest.fn(() => ({ matches: true })) as any;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle?.querySelector('#wc-root');

    await waitFor(() => expect(rootEle).toHaveAttribute('data-theme', 'light'));
  });

  it('should throw an error when theme has a wrong value', async () => {
    class Test extends DescopeWc {
      constructor() {
        super();
        Object.defineProperty(this, 'shadowRoot', {
          value: { isConnected: true },
        });
      }

      // eslint-disable-next-line class-methods-use-this
      public get projectId() {
        return '1';
      }

      // eslint-disable-next-line class-methods-use-this
      public get flowId() {
        return '1';
      }

      // eslint-disable-next-line class-methods-use-this
      public get theme() {
        return '1' as any;
      }
    }

    customElements.define('test-theme', Test);
    const descope = new Test();
    Object.defineProperty(descope.shadowRoot, 'host', {
      value: { closest: jest.fn() },
      writable: true,
    });

    await expect(descope.connectedCallback.bind(descope)).rejects.toThrow(
      `Supported theme values are "light", "dark", or leave empty for using the OS theme`
    );
  });

  it('should show form validation error when input is not valid', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent =
      '<button id="submitterId">click</button><input id="email" name="email" required placeholder="email" class="descope-input"></input><span>hey</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('click'), { timeout: 5000 });

    const buttonEle = await screen.findByShadowText('click');

    const inputEle = screen.getByShadowPlaceholderText(
      'email'
    ) as HTMLInputElement;

    inputEle.reportValidity = jest.fn();
    inputEle.checkValidity = jest.fn();

    fireEvent.click(buttonEle);

    await waitFor(() => expect(inputEle.reportValidity).toHaveBeenCalled());

    await waitFor(() => expect(inputEle.checkValidity).toHaveBeenCalled());
  });

  it('should call start with redirect url when provided', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    pageContent =
      '<button id="submitterId">click</button><input id="email" name="email"></input><span>hey</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" redirect-url="http://custom.url"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), { timeout: 5000 });

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        expect.objectContaining({ redirectUrl: 'http://custom.url' }),
        undefined,
        '',
        undefined,
        0
      )
    );
  });

  it('should create correctly sdk when telemetryKey configured', async () => {
    document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" telemetryKey="123"></descope-wc>`;

    await waitFor(() =>
      expect(createSdk as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ fpKey: '123', fpLoad: true })
      )
    );
  });

  it('should create correctly sdk when telemetryKey is not configured', async () => {
    document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() =>
      expect(createSdk as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          fpKey: undefined,
          fpLoad: false,
          persistTokens: true,
        })
      )
    );
  });

  describe('poll', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('When action type is "poll" - check that interval is removed properly', async () => {
      jest.spyOn(global, 'clearInterval');

      startMock.mockReturnValueOnce(
        generateSdkResponse({
          executionId: 'e1',
          stepId: 's1',
          screenId: '1',
          action: RESPONSE_ACTIONS.poll,
        })
      );

      nextMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      jest.runAllTimers();

      await waitFor(() => expect(clearInterval).toHaveBeenCalled(), {
        timeout: 10000,
      });
    });

    it('When has polling element - next with "polling", and check that interval is set properly', async () => {
      jest.spyOn(global, 'setInterval');

      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        })
      );

      pageContent = '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      jest.runAllTimers();

      await waitFor(
        () =>
          expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 2000),
        {
          timeout: 10000,
        }
      );
    });

    it('When screen has polling element and next returns the same response, should trigger polling again', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        })
      );

      pageContent =
        '<div data-type="polling">...</div><button>click</button><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      // Wait for first polling
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.polling,
            {}
          ),
        {
          timeout: 10000,
        }
      );

      // Reset mock to ensure it is triggered again with polling
      nextMock.mockClear();
      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        })
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
            {}
          ),
        {
          timeout: 10000,
        }
      );
    });

    it('When has polling element, and next poll returns polling response', async () => {
      jest.spyOn(global, 'setInterval');

      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock.mockReturnValue(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        })
      );

      pageContent = '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      jest.runAllTimers();

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(3), {
        timeout: 10000,
      });
    });

    it('When has polling element, and next poll returns completed response', async () => {
      jest.spyOn(global, 'setInterval');

      startMock.mockReturnValueOnce(generateSdkResponse());

      nextMock
        .mockReturnValueOnce(
          generateSdkResponse({
            action: RESPONSE_ACTIONS.poll,
          })
        )
        .mockReturnValueOnce(
          generateSdkResponse({
            status: 'completed',
          })
        );

      pageContent = '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const onSuccess = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      wcEle.addEventListener('success', onSuccess);

      jest.runAllTimers();

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
        timeout: 10000,
      });

      await waitFor(
        () =>
          expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ detail: 'auth info' })
          ),
        {
          timeout: 10000,
        }
      );

      wcEle.removeEventListener('success', onSuccess);
    });
  });

  describe('condition', () => {
    beforeEach(() => {
      localStorage.removeItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY);
    });
    it('Should fetch met screen when condition is met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}'
      );
      getLastUserLoginIdMock.mockReturnValue('abc');

      configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'));
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/met.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );
    });

    it('Should fetch unmet screen when condition is not met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}'
      );

      configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'));
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/unmet.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );
    });

    it('Should send condition interaction ID on submit click', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}'
      );
      getLastUserLoginIdMock.mockReturnValue('abc');

      const conditionInteractionId = 'gbutpyzvtgs';
      configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'lastAuth.loginId',
              met: {
                interactionId: conditionInteractionId,
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            version: 1,
          },
        },
      };

      pageContent = `<button type="button" id="interactionId">Click</button>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await screen.findByShadowText('Click');

      pageContent =
        '<input id="email"></input><input id="code"></input><span>It works!</span>';

      fireEvent.click(screen.getByShadowText('Click'));

      await waitFor(() =>
        expect(startMock).toBeCalledWith(
          'sign-in',
          {
            lastAuth: { authMethod: 'otp' },
            oidcIdpStateId: null,
            samlIdpStateId: null,
            samlIdpUsername: null,
            ssoAppId: null,
            redirectAuth: undefined,
            tenant: undefined,
          },
          conditionInteractionId,
          'interactionId',
          { origin: 'http://localhost' },
          1
        )
      );
    });
    it('Should call start with code and idpInitiated when idpInitiated condition is met', async () => {
      window.location.search = `?${URL_CODE_PARAM_NAME}=code1`;
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}'
      );
      getLastUserLoginIdMock.mockReturnValue('abc');
      configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            version: 1,
          },
        },
      };

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
      await waitFor(() =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            oidcIdpStateId: null,
            samlIdpStateId: null,
            samlIdpUsername: null,
            ssoAppId: null,
            redirectAuth: undefined,
            tenant: undefined,
            lastAuth: { authMethod: 'otp' },
          },
          undefined,
          '',
          {
            exchangeCode: 'code1',
            idpInitiated: true,
          },
          1
        )
      );
    });

    it('Should fetch unmet screen when idpInitiated condition is not met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'));
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/unmet.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );
    });

    it('Should call start with token and externalToken when externalToken condition is met', async () => {
      window.location.search = `?${URL_TOKEN_PARAM_NAME}=code1`;
      localStorage.setItem(
        DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
        '{"authMethod":"otp"}'
      );
      getLastUserLoginIdMock.mockReturnValue('abc');
      configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'externalToken',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            version: 1,
          },
        },
      };

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
      await waitFor(() =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            oidcIdpStateId: null,
            redirectAuth: undefined,
            tenant: undefined,
            lastAuth: { authMethod: 'otp' },
            samlIdpStateId: null,
            samlIdpUsername: null,
            ssoAppId: null,
          },
          undefined,
          '',
          {
            token: 'code1',
          },
          1
        )
      );
    });

    it('Should fetch unmet screen when externalToken condition is not met', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      configContent = {
        flows: {
          'sign-in': {
            condition: {
              key: 'externalToken',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          },
        },
      };

      pageContent = '<div>hey</div>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('hey'));
      expect(startMock).not.toBeCalled();
      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/unmet.html`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );
    });

    it('should call start with redirect auth data and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';

      const challenge = window.btoa('hash');
      const callback = 'https://mycallback.com';
      const encodedChallenge = encodeURIComponent(challenge);
      const encodedCallback = encodeURIComponent(callback);
      window.location.search = `?${URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME}=${encodedChallenge}&${URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME}=${encodedCallback}&${URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME}=android`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            oidcIdpStateId: null,
            samlIdpStateId: null,
            samlIdpUsername: null,
            ssoAppId: null,
            redirectAuth: { callbackUrl: callback, codeChallenge: challenge },
            tenant: undefined,
            lastAuth: {},
          },
          undefined,
          '',
          undefined,
          0
        )
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 6000,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with redirect auth data and token and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';
      const token = 'token1';
      const challenge = window.btoa('hash');
      const callback = 'https://mycallback.com';
      const encodedChallenge = encodeURIComponent(challenge);
      const encodedCallback = encodeURIComponent(callback);
      window.location.search = `?${URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME}=${encodedChallenge}&${URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME}=${encodedCallback}&${URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME}=android&${URL_TOKEN_PARAM_NAME}=${token}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            oidcIdpStateId: null,
            redirectAuth: { callbackUrl: callback, codeChallenge: challenge },
            tenant: undefined,
            lastAuth: {},
            samlIdpStateId: null,
            samlIdpUsername: null,
            ssoAppId: null,
          },
          undefined,
          '',
          { token },
          0
        )
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 6000,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with oidc idp flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';

      const oidcIdpStateId = 'abcdefgh';
      const encodedOidcIdpStateId = encodeURIComponent(oidcIdpStateId);
      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            oidcIdpStateId: 'abcdefgh',
            samlIdpStateId: null,
            samlIdpUsername: null,
            ssoAppId: null,
            tenant: undefined,
            redirectAuth: undefined,
            lastAuth: {},
          },
          undefined,
          '',
          undefined,
          0
        )
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 8000,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with oidc idp when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      pageContent = '<button>click</button><span>It works!</span>';

      const oidcIdpStateId = 'abcdefgh';
      const encodedOidcIdpStateId = encodeURIComponent(oidcIdpStateId);
      window.location.search = `?${OIDC_IDP_STATE_ID_PARAM_NAME}=${encodedOidcIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled());

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 6000,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled());
    });

    it('should call start with saml idp when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      pageContent = '<button>click</button><span>It works!</span>';

      const samlIdpStateId = 'abcdefgh';
      const encodedSamlIdpStateId = encodeURIComponent(samlIdpStateId);
      window.location.search = `?${SAML_IDP_STATE_ID_PARAM_NAME}=${encodedSamlIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled());

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 6000,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled());
    });

    it('should call start with saml idp with username when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      pageContent = '<button>click</button><span>It works!</span>';

      const samlIdpUsername = 'abcdefgh';
      const encodedSamlIdpUsername = encodeURIComponent(samlIdpUsername);
      window.location.search = `?${SAML_IDP_USERNAME_PARAM_NAME}=${encodedSamlIdpUsername}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled());

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 6000,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled());
    });

    it('should call start with saml idp flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';

      const samlIdpStateId = 'abcdefgh';
      const encodedSamlIdpStateId = encodeURIComponent(samlIdpStateId);
      window.location.search = `?${SAML_IDP_STATE_ID_PARAM_NAME}=${encodedSamlIdpStateId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            oidcIdpStateId: null,
            samlIdpStateId: 'abcdefgh',
            samlIdpUsername: null,
            ssoAppId: null,
            tenant: undefined,
            redirectAuth: undefined,
            lastAuth: {},
          },
          undefined,
          '',
          undefined,
          0
        )
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 6000,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with saml idp with username flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';

      const samlIdpStateId = 'abcdefgh';
      const encodedSamlIdpStateId = encodeURIComponent(samlIdpStateId);
      const samlIdpUsername = 'dummyUser';
      const encodedSamlIdpUsername = encodeURIComponent(samlIdpUsername);
      window.location.search = `?${SAML_IDP_STATE_ID_PARAM_NAME}=${encodedSamlIdpStateId}&${SAML_IDP_USERNAME_PARAM_NAME}=${encodedSamlIdpUsername}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            oidcIdpStateId: null,
            samlIdpStateId: 'abcdefgh',
            samlIdpUsername: 'dummyUser',
            ssoAppId: null,
            tenant: undefined,
            redirectAuth: undefined,
            lastAuth: {},
          },
          undefined,
          '',
          undefined,
          0
        )
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 6000,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('should call start with ssoAppId when there is a start screen is configured', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      configContent = {
        flows: {
          'sign-in': { startScreenId: 'screen-0' },
        },
      };

      pageContent = '<button>click</button><span>It works!</span>';

      const ssoAppId = 'abcdefgh';
      const encodedSSOAppId = encodeURIComponent(ssoAppId);
      window.location.search = `?${SSO_APP_ID_PARAM_NAME}=${encodedSSOAppId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled());

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 6000,
      });

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() => expect(nextMock).toHaveBeenCalled());
    });

    it('should call start with ssoAppId flag and clear it from url', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      pageContent = '<span>It works!</span>';

      const ssoAppId = 'abcdefgh';
      const encodedSSOAppId = encodeURIComponent(ssoAppId);
      window.location.search = `?${SSO_APP_ID_PARAM_NAME}=${encodedSSOAppId}`;
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() =>
        expect(startMock).toHaveBeenCalledWith(
          'sign-in',
          {
            oidcIdpStateId: null,
            samlIdpStateId: null,
            samlIdpUsername: null,
            ssoAppId: 'abcdefgh',
            tenant: undefined,
            redirectAuth: undefined,
            lastAuth: {},
          },
          undefined,
          '',
          undefined,
          0
        )
      );
      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 6000,
      });
      await waitFor(() => expect(window.location.search).toBe(''));
    });
  });

  it('Should call start with code and idpInitiated when idpInitiated condition is met in multiple conditions', async () => {
    window.location.search = `?${URL_CODE_PARAM_NAME}=code1`;
    configContent = {
      flows: {
        'sign-in': {
          conditions: [
            {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          ],
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        {
          oidcIdpStateId: null,
          samlIdpStateId: null,
          samlIdpUsername: null,
          ssoAppId: null,
          redirectAuth: undefined,
          tenant: undefined,
          lastAuth: {},
        },
        undefined,
        '',
        {
          exchangeCode: 'code1',
          idpInitiated: true,
        },
        1
      )
    );
  });

  it('Should call start with code and idpInitiated when idpInitiated condition is met in multiple conditions with last auth', async () => {
    window.location.search = `?${URL_CODE_PARAM_NAME}=code1`;
    configContent = {
      flows: {
        'sign-in': {
          conditions: [
            {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          ],
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        {
          oidcIdpStateId: null,
          samlIdpStateId: null,
          samlIdpUsername: null,
          ssoAppId: null,
          redirectAuth: undefined,
          tenant: undefined,
          lastAuth: {},
        },
        undefined,
        '',
        {
          exchangeCode: 'code1',
          idpInitiated: true,
        },
        1
      )
    );
  });

  it('Should fetch met screen when second condition is met', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    localStorage.setItem(
      DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
      '{"authMethod":"otp"}'
    );
    getLastUserLoginIdMock.mockReturnValue('abc');

    configContent = {
      flows: {
        'sign-in': {
          conditions: [
            {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
          ],
        },
      },
    };

    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'));
    expect(startMock).not.toBeCalled();
    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/met.html`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object)
    );
  });
  it('Should fetch else screen when else is met', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    localStorage.setItem(
      DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
      '{"authMethod":"otp"}'
    );
    getLastUserLoginIdMock.mockReturnValue('');

    configContent = {
      flows: {
        'sign-in': {
          conditions: [
            {
              key: 'idpInitiated',
              met: {
                interactionId: 'gbutpyzvtgs',
              },
              operator: 'is-true',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            {
              key: 'lastAuth.loginId',
              met: {
                interactionId: 'gbutpyzvtgs',
                screenId: 'met',
              },
              operator: 'not-empty',
              unmet: {
                interactionId: 'ELSE',
                screenId: 'unmet',
              },
            },
            {
              key: 'ELSE',
              met: {
                interactionId: '123123',
                screenId: 'else',
              },
            },
          ],
        },
      },
    };

    pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'));
    expect(startMock).not.toBeCalled();
    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/else.html`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object)
    );
  });

  describe('locale', () => {
    it('should fetch the data from the correct path when locale provided without target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail locale="en-us"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: 3000,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object)
      );
    });

    it('should fetch the data from the correct path when locale provided with target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        flows: {
          otpSignInEmail: {
            targetLocales: ['en-US'],
          },
        },
      };

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="en-Us"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 8000,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en-us.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object)
      );
    }, 10000);

    it('should fetch the data from the correct path when locale provided and not part of target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        flows: {
          otpSignInEmail: {
            targetLocales: ['de'],
          },
        },
      };

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail" locale="en-us"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: 3000,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object)
      );
    });

    it('should fetch the data from the correct path when locale provided in navigator', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        flows: {
          otpSignInEmail: {
            targetLocales: ['en-US'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'en-Us',
        writable: true,
      });

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: 3000,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en-us.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object)
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when locale provided in navigator but not in target locales', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        flows: {
          otpSignInEmail: {
            targetLocales: ['de'],
          },
        },
      };

      Object.defineProperty(navigator, 'language', {
        value: 'en-Us',
        writable: true,
      });

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: 3000,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object)
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should fetch the data from the correct path when locale provided in navigator and request to locale fails', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      configContent = {
        flows: {
          otpSignInEmail: {
            targetLocales: ['en-US'],
          },
        },
      };

      const fn = fetchMock.getMockImplementation();
      fetchMock.mockImplementation((url: string) => {
        if (url.endsWith('en-us.html')) {
          return { ok: false };
        }
        return fn(url);
      });

      Object.defineProperty(navigator, 'language', {
        value: 'en-Us',
        writable: true,
      });

      pageContent = '<input id="email"></input><span>It works!</span>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('It works!'), {
        timeout: 3000,
      });

      const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/0-en-us.html`;
      const expectedHtmlFallbackPath = `/pages/1/${ASSETS_FOLDER}/0.html`;
      const expectedThemePath = `/pages/1/${ASSETS_FOLDER}/${THEME_FILENAME}`;
      const expectedConfigPath = `/pages/1/${ASSETS_FOLDER}/${CONFIG_FILENAME}`;

      const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);
      const htmlUrlFallbackPathRegex = new RegExp(
        `//[^/]+${expectedHtmlFallbackPath}$`
      );
      const themeUrlPathRegex = new RegExp(`//[^/]+${expectedThemePath}$`);
      const configUrlPathRegex = new RegExp(`//[^/]+${expectedConfigPath}$`);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(htmlUrlFallbackPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(themeUrlPathRegex),
        expect.any(Object)
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(configUrlPathRegex),
        expect.any(Object)
      );

      Object.defineProperty(navigator, 'language', {
        value: '',
        writable: true,
      });
    });

    it('should validate handling of saml idp response (html form)', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          ok: true,
          executionId: 'e1',
          action: RESPONSE_ACTIONS.loadForm,
          samlIdpFormResponse:
            `<form method="post" action="POST" id="SAMLResponseForm">` +
            `<input type="hidden" data-testid="input-saml-res" name="SAMLResponse" value="DUMMY-SAML-RESPONSE" />` +
            `<input type="hidden" data-testid="input-relay-state" name="RelayState" value="DUMMY-RELAY-STATE" />` +
            `<input id="SAMLSubmitButton" type="submit" value="Continue" />` +
            `</form>` +
            `<script>document.getElementById('SAMLSubmitButton').style.visibility='hidden';</script>` +
            `<script>document.getElementById('SAMLResponseForm')</script>`,
        })
      );

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

      // validate form render
      await waitFor(
        () => {
          expect(screen.getByTestId('input-saml-res')).toBeInTheDocument();
          expect(screen.getByTestId('input-saml-res')).not.toBeVisible();
          expect(screen.getByTestId('input-relay-state')).toBeInTheDocument();
          expect(screen.getByTestId('input-relay-state')).not.toBeVisible();
        },
        {
          timeout: 6000,
        }
      );
    });

    it('should automatic fill saml idp username in form element', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          ok: true,
          executionId: 'e1',
        })
      );
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      const samlIdpEmailAddress = 'dummy@email.com';
      const encodedSamlIdpEmailAddress =
        encodeURIComponent(samlIdpEmailAddress);
      window.location.search = `?${SAML_IDP_USERNAME_PARAM_NAME}=${encodedSamlIdpEmailAddress}`;

      pageContent = `<div>Loaded</div><input class="descope-input" id="loginId" name="loginId" value="{{loginId}}">{{loginId}}</input><input class="descope-input" id="email" name="email">{{email}}</input>`;

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

      await waitFor(() => screen.findByShadowText('Loaded'), {
        timeout: 6000,
      });

      const inputs = await waitFor(
        () => screen.findAllByShadowDisplayValue(samlIdpEmailAddress),
        {
          timeout: 6000,
        }
      );

      expect(inputs.length).toBe(2);
    });
  });
});

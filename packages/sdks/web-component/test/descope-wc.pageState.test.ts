/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  generateSdkResponse,
  getLastUserLoginIdMock,
  getLastUserDisplayNameMock,
  isWebauthnSupportedMock,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { ELEMENT_TYPE_ATTRIBUTE } from '../src/lib/constants';

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

describe('web-component page state and templates', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('should update the page messages when page is remaining the same but the state is updated', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(
      generateSdkResponse({ screenState: { errorText: 'Error!' } }),
    );

    fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded1</div><span ${ELEMENT_TYPE_ATTRIBUTE}="error-message">xxx</span>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });

    fixtures.pageContent = `<div>Loaded2</div><span ${ELEMENT_TYPE_ATTRIBUTE}="error-message">xxx</span>`;

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(
      () =>
        screen.getByShadowText('Error!', {
          selector: `[${ELEMENT_TYPE_ATTRIBUTE}="error-message"]`,
        }),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should update page inputs according to screen state', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(
      generateSdkResponse({ screenState: { inputs: { email: 'email1' } } }),
    );

    fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="email">`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => screen.getByShadowDisplayValue('email1'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('should go next with no file', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse());

    (global as any).FileReader = MockFileReader;

    fixtures.pageContent = `<descope-button>click</descope-button><div>Loaded</div><input class="descope-input" name="image" type="file" placeholder="image-ph">`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith(
          '0',
          '0',
          null,
          1,
          '1.2.3',
          {
            image: '',
            origin: 'http://localhost',
          },
          false,
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should update page templates according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } }),
    );

    fixtures.pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{user.name}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey john!'));
  });

  it('should update page templates according to last auth login ID when there is no login Id', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: {} } }),
    );
    getLastUserLoginIdMock.mockReturnValue('');

    fixtures.pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.loginId}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey !'));
  });

  it('should update page templates according to last auth login ID when there is only login Id in lastAuth with no authMethod', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: { user: {} },
        lastAuth: { loginId: 'not john' },
      }),
    );
    getLastUserLoginIdMock.mockReturnValue('');

    fixtures.pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.loginId}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey !'));
  });

  it('should update page templates according to last auth login ID when there is only login Id', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { loginId: 'john' } } }),
    );
    getLastUserLoginIdMock.mockReturnValue('not john');

    fixtures.pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.loginId}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey not john!'));
  });

  it('should update page templates according to last auth name when there is only login Id', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } }),
    );
    getLastUserLoginIdMock.mockReturnValue('not john');

    fixtures.pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.name}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey not john!'));
  });

  it('should update page templates according to last auth name when there is login Id and name', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { user: { name: 'john' } } }),
    );
    getLastUserLoginIdMock.mockReturnValue('not john');
    getLastUserDisplayNameMock.mockReturnValue('Niros!');

    fixtures.pageContent = `<div>Loaded1</div><descope-text class="descope-text">hey {{lastAuth.name}}!</descope-text>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('hey Niros!!'), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('should update totp and notp link href according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          totp: { provisionUrl: 'url1' },
          notp: { redirectUrl: 'url2' },
        },
      }),
    );

    fixtures.pageContent = `<div>Loaded1</div>
      <descope-link data-type="totp-link">Provision URL</descope-link>
      <descope-link data-type="notp-link">Redirect URL</descope-link>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });
    await waitFor(() => screen.getByShadowText('Provision URL'));

    const totpLink = screen.getByShadowText('Provision URL');
    expect(totpLink).toHaveAttribute('href', 'url1');

    const notpLink = screen.getByShadowText('Redirect URL');
    expect(notpLink).toHaveAttribute('href', 'url2');
  });

  it('should disable webauthn buttons when its not supported in the browser', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    isWebauthnSupportedMock.mockReturnValue(false);

    fixtures.pageContent = `<div>Loaded1</div><descope-button data-type="biometrics">Webauthn</descope-button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });

    const btn = screen.getByShadowText('Webauthn');
    expect(btn).toHaveAttribute('disabled', 'true');
  });

  it('should update root css var according to screen state', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { totp: { image: 'base-64-text' } } }),
    );

    const spyGet = jest.spyOn(customElements, 'get');
    spyGet.mockReturnValueOnce({ cssVarList: { url: '--url' } } as any);

    fixtures.pageContent = `<div>Loaded1</div>`;

    document.body.innerHTML = `<h1>Custom element test</h1><descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded1'), {
      timeout: WAIT_TIMEOUT,
    });

    const shadowEle = document.getElementsByTagName('descope-wc')[0].shadowRoot;

    const rootEle = shadowEle.querySelector('#content-root');
    await waitFor(
      () =>
        expect(rootEle).toHaveStyle({
          '--url': 'url(data:image/jpg;base64,base-64-text)',
        }),
      { timeout: WAIT_TIMEOUT },
    );
  });
});

// eslint-disable-next-line max-classes-per-file
import createSdk from '@descope/web-js-sdk';
import { fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { screen } from 'shadow-dom-testing-library';
import '../src/lib/descope-wc';

const generateSdkResponse = ({
  ok = true,
  stepId = '0',
  screenId = '0',
  redirectUrl = '',
  screenState = {},
  action = 'screen',
  executionId = '0',
  status = 'running',
  requestErrorMessage = '',
  requestErrorDescription = '',
  webAuthnTransactionId = '',
  webAuthnOptions = '',
  error = null,
  headers = new Headers({ h: '1' }),
} = {}) => ({
  ok,
  headers,
  data: {
    stepId,
    action,
    screen: { id: screenId, state: screenState },
    redirect: { url: redirectUrl },
    executionId,
    status,
    authInfo: 'auth info',
    webauthn: {
      options: webAuthnOptions,
      transactionId: webAuthnTransactionId,
    },
    error,
  },
  error: {
    errorMessage: requestErrorMessage,
    errorDescription: requestErrorDescription,
  },
});

jest.mock('@descope/web-js-sdk', () => {
  const sdk = {
    flow: {
      start: jest.fn().mockName('flow.start'),
      next: jest.fn().mockName('flow.next'),
    },
    webauthn: { helpers: { isSupported: jest.fn() } },
    getLastUserLoginId: jest.fn().mockName('getLastUserLoginId'),
    getLastUserDisplayName: jest.fn().mockName('getLastUserDisplayName'),
  };
  return {
    __esModule: true,
    default: () => sdk,
    clearFingerprintData: jest.fn(),
  };
});

const sdk = createSdk({ projectId: '' });

const startMock = sdk.flow.start as jest.Mock;

// this is for mocking the pages/theme/config
let pageContent = '';

const fetchMock: jest.Mock = jest.fn();
global.fetch = fetchMock;

Object.defineProperty(window, 'location', {
  value: new URL(window.location.origin),
});
window.location.assign = jest.fn();

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

describe('debugger', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock.mockImplementation((url: string) => {
      const res = {
        ok: true,
        headers: new Headers({ h: '1' }),
      };

      switch (true) {
        case url.endsWith('theme.css'): {
          return { ...res, text: () => '' };
        }
        case url.endsWith('.html'): {
          return { ...res, text: () => pageContent };
        }
        case url.endsWith('config.json'): {
          return { ...res, json: () => ({}) };
        }
        default: {
          return { ok: false };
        }
      }
    });
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
    jest.resetAllMocks();
  });

  it('should not render the debugger when debug is not set', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    pageContent = '<input id="email"></input><span>It works!</span>';

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    jest.runAllTimers();

    await screen.findByShadowText('It works!');

    expect(document.getElementsByTagName('descope-debugger').length).toBe(0);
  });
  it('should render the debugger with an empty state when debug is set to true', async () => {
    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" debug="true"></descope-wc>`;

    await waitFor(() =>
      expect(
        screen.getByShadowText('No errors detected 👀')
      ).toBeInTheDocument()
    );
  });

  it('should add a debugger message when got a response error', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({
        ok: false,
        requestErrorMessage: 'error message!',
        requestErrorDescription: 'error description!',
      })
    );

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" debug="true"></descope-wc>`;

    await waitFor(() =>
      expect(screen.getByShadowText('error message!')).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByShadowText('error description!')).toBeInTheDocument()
    );
  });

  it('should add a debugger message when got a screen error', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({ screenState: { errorText: 'error message!' } })
    );

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" debug="true"></descope-wc>`;

    await waitFor(() =>
      expect(screen.getByShadowText('error message!')).toBeInTheDocument()
    );
  });

  it('should add a debugger message when receiving a flow response error', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({
        error: { code: '123', description: 'description', message: 'message' },
      })
    );

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" debug="true"></descope-wc>`;

    await waitFor(() =>
      expect(screen.getByShadowText('[123]: description')).toBeInTheDocument()
    );
  });

  it('should remain visible when resizing the window', async () => {
    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" debug="true"></descope-wc>`;

    await waitFor(() =>
      expect(
        screen.getByShadowText('No errors detected 👀')
      ).toBeInTheDocument()
    );

    fireEvent.resize(window, {});

    await waitFor(() =>
      expect(screen.getByShadowText('No errors detected 👀')).toBeVisible()
    );
  });

  it('should toggle debugger when flag changes', async () => {
    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" debug="true"></descope-wc>`;

    await waitFor(() =>
      expect(
        screen.getByShadowText('No errors detected 👀')
      ).toBeInTheDocument()
    );

    const wcEle = document.getElementsByTagName('descope-wc')[0];

    wcEle.setAttribute('debug', 'false');

    await waitFor(() =>
      expect(document.getElementsByTagName('descope-debugger').length).toBe(0)
    );
  });

  it('should collapse message when clicking on its title', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({
        ok: false,
        requestErrorMessage: 'error message!',
        requestErrorDescription: 'error description!',
      })
    );

    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { value: 300 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 200 });

    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" debug="true"></descope-wc>`;

    await waitFor(() =>
      expect(screen.getByShadowText('error description!')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByShadowText('error description!'));

    expect(
      screen.getByShadowText('error message!').parentElement.parentElement
    ).toHaveClass('collapsed');
  });
});

import { createSdk } from '@descope/web-js-sdk';
import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import '../src/lib/descope-wc';
import { invokeScriptOnload } from './testUtils';

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
    createSdk: () => sdk,
    clearFingerprintData: jest.fn(),
  };
});

const sdk = createSdk({ projectId: '' });
const startMock = sdk.flow.start as jest.Mock;

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

const startResponse = {
  ok: true,
  headers: new Headers({ h: '1' }),
  data: {
    stepId: '0',
    action: 'screen',
    screen: { id: '0', state: {} },
    redirect: { url: '' },
    executionId: '0',
    status: 'running',
    authInfo: 'auth info',
    webauthn: { options: '', transactionId: '' },
    error: null,
  },
  error: { errorMessage: '', errorDescription: '' },
};

// Inject a spy logger onto every <descope-wc> on the page. The duplicate check
// reads `this.logger` lazily (in a deferred microtask), so a logger set
// synchronously right after mount is the one it uses.
const installLoggerSpy = () => {
  const warn = jest.fn();
  document.querySelectorAll('descope-wc').forEach((el) => {
    // eslint-disable-next-line no-param-reassign
    (el as any).logger = {
      error: jest.fn(),
      warn,
      info: jest.fn(),
      debug: jest.fn(),
    };
  });
  return warn;
};

const duplicateWarnCount = (warn: jest.Mock) =>
  warn.mock.calls.filter((args) =>
    String(args[0]).includes('Multiple Descope flow components'),
  ).length;

describe('duplicate flow warning', () => {
  beforeEach(() => {
    fetchMock.mockImplementation((url: string) => {
      const res = { ok: true, headers: new Headers({ h: '1' }) };
      if (url.endsWith('theme.json')) return { ...res, json: () => null };
      if (url.endsWith('.html'))
        return { ...res, text: () => '<span>ok</span>' };
      if (url.endsWith('config.json')) return { ...res, json: () => ({}) };
      return { ok: false };
    });
    startMock.mockReturnValue(startResponse);
    invokeScriptOnload();
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
    jest.resetAllMocks();
  });

  it('warns once when two components share the same project-id and flow-id', async () => {
    document.body.innerHTML = `
      <descope-wc flow-id="sign-in" project-id="p1"></descope-wc>
      <descope-wc flow-id="sign-in" project-id="p1"></descope-wc>`;
    const warn = installLoggerSpy();

    await waitFor(() => expect(duplicateWarnCount(warn)).toBe(1));
    // stays at one even though formMountMixin re-parents (connectedCallback fires twice)
    await new Promise((r) => {
      setTimeout(r, 50);
    });
    expect(duplicateWarnCount(warn)).toBe(1);
  });

  it('does not warn for a single component', async () => {
    document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="p1"></descope-wc>`;
    const warn = installLoggerSpy();

    await new Promise((r) => {
      setTimeout(r, 50);
    });
    expect(duplicateWarnCount(warn)).toBe(0);
  });

  it('does not warn for two components running different flows', async () => {
    document.body.innerHTML = `
      <descope-wc flow-id="sign-in" project-id="p1"></descope-wc>
      <descope-wc flow-id="sign-up" project-id="p1"></descope-wc>`;
    const warn = installLoggerSpy();

    await new Promise((r) => {
      setTimeout(r, 50);
    });
    expect(duplicateWarnCount(warn)).toBe(0);
  });

  it('warns when a flow-id change makes a component collide with another', async () => {
    document.body.innerHTML = `
      <descope-wc flow-id="sign-in" project-id="p1"></descope-wc>
      <descope-wc id="second" flow-id="sign-up" project-id="p1"></descope-wc>`;
    const warn = installLoggerSpy();

    // no collision yet
    await new Promise((r) => {
      setTimeout(r, 50);
    });
    expect(duplicateWarnCount(warn)).toBe(0);

    // change makes it a duplicate of the first
    document.getElementById('second')!.setAttribute('flow-id', 'sign-in');
    await waitFor(() => expect(duplicateWarnCount(warn)).toBe(1));
  });
});

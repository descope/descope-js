/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-style --
   sdk-mixins does not install @testing-library/jest-dom (only the lint plugin), so
   those matchers aren't available here; assert on the DOM directly. */
// componentsConditionsMixin composes initElementMixin (which attaches a shadow
// DOM and builds contentRootElement) and loggerMixin. Mock both down to identity
// mixins - the same approach modalMixin.test.ts uses - and let the bare base
// stub provide the small surface the mixin actually reads: getAttribute, api
// (for httpClient), logger, and contentRootElement.
jest.mock('../loggerMixin', () => ({
  loggerMixin: (superclass: any) => class extends superclass {},
}));
jest.mock('../initElementMixin', () => ({
  initElementMixin: (superclass: any) => class extends superclass {},
}));

// eslint-disable-next-line import/first
import { componentsConditionsMixin } from './componentsConditionsMixin';

type ResponseLike = { ok: boolean; json?: () => Promise<any> };

const okResponse = (componentsState: Record<string, string>): ResponseLike => ({
  ok: true,
  json: async () => ({ componentsState }),
});

// Build a widget element instance from the mixin with a controllable host:
// - attrs backs getAttribute (so mock="true" can be toggled)
// - httpClient (if given) is exposed via the api getter the mixin reads
// - contentRootElement holds the DOM the applier acts on
const createWidgetEl = ({
  attrs = {},
  httpClient,
  withApi = true,
}: {
  attrs?: Record<string, string>;
  httpClient?: { get: jest.Mock };
  withApi?: boolean;
} = {}) => {
  const contentRootElement = document.createElement('div');

  class Base {
    contentRootElement = contentRootElement;

    // eslint-disable-next-line class-methods-use-this
    get api() {
      // "missing httpClient" case: return {} so api.httpClient is undefined.
      return withApi ? { httpClient } : undefined;
    }

    logger = {
      error() {},
      warn() {},
      info() {},
      debug() {},
    };

    // eslint-disable-next-line class-methods-use-this
    getAttribute(name: string) {
      return attrs[name] ?? null;
    }
  }

  const MixinClass = componentsConditionsMixin(Base as any);
  const el = new MixinClass() as any;
  return { el, contentRootElement };
};

// Append a targetable component with a data-id into the widget content root.
const addComponent = (root: HTMLElement, dataId: string) => {
  const node = document.createElement('div');
  node.setAttribute('data-id', dataId);
  root.appendChild(node);
  return node;
};

describe('componentsConditionsMixin lifecycle', () => {
  it('throws on init when the sdk does not expose httpClient', async () => {
    const { el } = createWidgetEl({ withApi: false });

    await expect(el.init()).rejects.toThrow(/must expose `httpClient`/);
  });

  it('mock mode skips the fetch and hides nothing', async () => {
    const httpClient = { get: jest.fn() };
    const { el, contentRootElement } = createWidgetEl({
      attrs: { mock: 'true' },
      httpClient,
    });
    const passkey = addComponent(contentRootElement, 'passkey');

    await el.init();
    await el.onWidgetRootReady();

    expect(httpClient.get).not.toHaveBeenCalled();
    expect(passkey.hasAttribute('hidden')).toBe(false);
    expect(passkey.style.display).toBe('');
  });

  it('happy path: hides the component named in the fetched state', async () => {
    const httpClient = {
      get: jest.fn(async () => okResponse({ passkey: 'hide' })),
    };
    const { el, contentRootElement } = createWidgetEl({ httpClient });
    const passkey = addComponent(contentRootElement, 'passkey');
    const email = addComponent(contentRootElement, 'email');

    await el.init();
    await el.onWidgetRootReady();

    expect(httpClient.get).toHaveBeenCalledTimes(1);
    // applier effect: hidden attribute + inline display:none
    expect(passkey.hasAttribute('hidden')).toBe(true);
    expect(passkey.style.display).toBe('none');
    // untargeted component is untouched
    expect(email.hasAttribute('hidden')).toBe(false);
  });

  it('fails open when the fetch rejects (no throw, nothing hidden)', async () => {
    const httpClient = {
      get: jest.fn(async () => Promise.reject(new Error('network'))),
    };
    const { el, contentRootElement } = createWidgetEl({ httpClient });
    const passkey = addComponent(contentRootElement, 'passkey');

    await el.init();
    await expect(el.onWidgetRootReady()).resolves.not.toThrow();

    expect(passkey.hasAttribute('hidden')).toBe(false);
    expect(passkey.style.display).toBe('');
  });

  it('fails open when the response is not ok (nothing hidden)', async () => {
    const httpClient = {
      get: jest.fn(async () => ({ ok: false }) as ResponseLike),
    };
    const { el, contentRootElement } = createWidgetEl({ httpClient });
    const passkey = addComponent(contentRootElement, 'passkey');

    await el.init();
    await el.onWidgetRootReady();

    expect(passkey.hasAttribute('hidden')).toBe(false);
    expect(passkey.style.display).toBe('');
  });
});

// reevaluateComponentsState is a public hook for the upcoming
// re-evaluate-on-mutation work. No widget wires it to a mutating flow yet, so
// it is exercised here directly: it must clear the previously applied verdict,
// re-fetch, and apply the new one - failing open like the initial apply.
describe('componentsConditionsMixin reevaluateComponentsState', () => {
  it('re-fetches and applies the new verdict, clearing the previous one', async () => {
    const httpClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce(okResponse({ passkey: 'hide' }))
        .mockResolvedValueOnce(okResponse({ email: 'disable' })),
    };
    const { el, contentRootElement } = createWidgetEl({ httpClient });
    const passkey = addComponent(contentRootElement, 'passkey');
    const email = addComponent(contentRootElement, 'email');

    await el.init();
    await el.onWidgetRootReady();
    expect(passkey.hasAttribute('hidden')).toBe(true);

    await el.reevaluateComponentsState();

    expect(httpClient.get).toHaveBeenCalledTimes(2);
    // previous verdict cleared
    expect(passkey.hasAttribute('hidden')).toBe(false);
    expect(passkey.style.display).toBe('');
    // new verdict applied
    expect(email.getAttribute('disabled')).toBe('true');
  });

  it('clears the previous verdict when the new state is empty', async () => {
    const httpClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce(okResponse({ passkey: 'hide' }))
        .mockResolvedValueOnce(okResponse({})),
    };
    const { el, contentRootElement } = createWidgetEl({ httpClient });
    const passkey = addComponent(contentRootElement, 'passkey');

    await el.init();
    await el.onWidgetRootReady();
    expect(passkey.hasAttribute('hidden')).toBe(true);

    await el.reevaluateComponentsState();

    expect(passkey.hasAttribute('hidden')).toBe(false);
    expect(passkey.style.display).toBe('');
  });

  it('fails open when the re-fetch rejects (clears old verdict, no throw)', async () => {
    const httpClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce(okResponse({ passkey: 'hide' }))
        .mockRejectedValueOnce(new Error('network')),
    };
    const { el, contentRootElement } = createWidgetEl({ httpClient });
    const passkey = addComponent(contentRootElement, 'passkey');

    await el.init();
    await el.onWidgetRootReady();
    expect(passkey.hasAttribute('hidden')).toBe(true);

    await expect(el.reevaluateComponentsState()).resolves.not.toThrow();

    expect(passkey.hasAttribute('hidden')).toBe(false);
    expect(passkey.style.display).toBe('');
  });

  it('throws when the sdk does not expose httpClient', async () => {
    const { el } = createWidgetEl({ withApi: false });

    await expect(el.reevaluateComponentsState()).rejects.toThrow(
      /must expose `httpClient`/,
    );
  });
});

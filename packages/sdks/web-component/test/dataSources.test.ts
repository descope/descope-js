// @ts-nocheck
import {
  createDataSources,
  getDeclaredNames,
  DATA_SOURCE_TIMEOUT_MS,
  DATA_SOURCES_URL_KEY,
  DATA_SOURCES_VERSION,
} from '../src/lib/helpers/dataSources';

const makeDs = (name, methods, overrides = {}) => ({
  name,
  endpoint: `/v1/flow/ds/${name}`,
  methods,
  ...overrides,
});

const setup = ({ registry = {}, version, failLoad = [] } = {}) => {
  const injectNpmLib = jest.fn(async (lib, ver, path) => {
    const key = path.replace(/^dist\/(.+)\.js$/, '$1');
    if (failLoad.includes(key) || failLoad.includes(`${key}:${ver}`))
      throw new Error('404');
    globalThis.descope = globalThis.descope || { dataSources: {} };
    if (registry[key]) globalThis.descope.dataSources[key] = registry[key];
  });
  const post = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: 1 }),
  }));
  const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const flowState = { executionId: 'exec-1', stepId: 'step-1' };
  const ds = createDataSources({
    injectNpmLib,
    getVersion: async () => version,
    getFlowState: () => flowState,
    post,
    logger,
  });
  return { ds, injectNpmLib, post, logger, flowState };
};

const component = (declared = 'cars', id = 'comp-1') => {
  const el = document.createElement('descope-thing');
  el.id = id;
  if (declared !== null) el.setAttribute('data-descope-ds', declared);
  document.body.appendChild(el);
  return el;
};

const ask = (ds, el, name) =>
  new Promise((resolve) => {
    const event = new CustomEvent('descope-data-source', {
      detail: { name, resolve },
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: el });
    ds.handleEvent(event);
    if (!event.defaultPrevented) resolve('unanswered');
  });

afterEach(() => {
  delete globalThis.descope;
  document.body.innerHTML = '';
  localStorage.clear();
  jest.useRealTimers();
});

describe('getDeclaredNames', () => {
  it('trims, dedupes and drops invalid names', () => {
    const el = component(' cars , tenants, cars ,, Bad Name, ../x, cars@2');
    expect(getDeclaredNames(el)).toEqual(['cars', 'tenants']);
  });
});

describe('createDataSources', () => {
  it('loads the pinned version by default and the project override when set', async () => {
    const cars = makeDs('cars', { list: async () => 1 });
    const pinned = setup({ registry: { cars: cars } });
    await ask(pinned.ds, component(), 'cars');
    expect(pinned.injectNpmLib).toHaveBeenCalledWith(
      '@descope/components-data-sources',
      DATA_SOURCES_VERSION,
      'dist/cars.js',
      [],
    );

    delete globalThis.descope;
    const overridden = setup({
      registry: { cars: cars },
      version: '1.2.3',
    });
    await ask(overridden.ds, component(), 'cars');
    expect(overridden.injectNpmLib.mock.calls[0][1]).toBe('1.2.3');
  });

  it.each([['../../evil'], ['1.0.0/../x'], ['latest']])(
    'ignores a project override that is not an exact version (%p)',
    async (version) => {
      const { ds, injectNpmLib } = setup({
        registry: { cars: makeDs('cars', {}) },
        version,
      });
      await ask(ds, component(), 'cars');
      expect(injectNpmLib.mock.calls[0][1]).toBe(DATA_SOURCES_VERSION);
    },
  );

  it('falls back to the pinned version when the project version lacks the data source', async () => {
    const { ds, injectNpmLib, logger } = setup({
      registry: { cars: makeDs('cars', { list: async () => 1 }) },
      version: '1.2.3',
      failLoad: ['cars:1.2.3'],
    });
    const handle = await ask(ds, component(), 'cars');
    expect(injectNpmLib.mock.calls.map((c) => c[1])).toEqual([
      '1.2.3',
      DATA_SOURCES_VERSION,
    ]);
    expect(logger.warn).toHaveBeenCalled();
    await expect(handle.list()).resolves.toEqual({ data: 1 });
  });

  it('returns null when neither the project nor the pinned version has the data source', async () => {
    const { ds, injectNpmLib, logger } = setup({
      version: '1.2.3',
      failLoad: ['cars'],
    });
    await expect(ask(ds, component(), 'cars')).resolves.toBeNull();
    expect(injectNpmLib).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenLastCalledWith(
      `Data source "cars" not found in @descope/components-data-sources@${DATA_SOURCES_VERSION}`,
      '404',
    );
  });

  it('loads the pinned version when the project config fails', async () => {
    const { injectNpmLib } = setup({
      registry: { cars: makeDs('cars', {}) },
    });
    const failing = createDataSources({
      injectNpmLib,
      getVersion: async () => {
        throw new Error('config');
      },
      getFlowState: () => ({}),
      post: jest.fn(),
      logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });
    await expect(ask(failing, component(), 'cars')).resolves.not.toBeNull();
    expect(injectNpmLib.mock.calls[0][1]).toBe(DATA_SOURCES_VERSION);
  });

  it('loads from the local override first when set', async () => {
    localStorage.setItem(DATA_SOURCES_URL_KEY, 'http://localhost:5600/');
    const { ds, injectNpmLib } = setup({
      registry: { cars: makeDs('cars', {}) },
    });
    await ask(ds, component(), 'cars');
    expect(injectNpmLib.mock.calls[0][3]).toEqual([
      'http://localhost:5600/dist/cars.js',
    ]);
  });

  it('loads a data source once for many components', async () => {
    const { ds, injectNpmLib } = setup({
      registry: { cars: makeDs('cars', {}) },
    });
    await Promise.all([
      ask(ds, component('cars', 'a'), 'cars'),
      ask(ds, component('cars', 'b'), 'cars'),
    ]);
    expect(injectNpmLib).toHaveBeenCalledTimes(1);
  });

  it('preloads what the screen declares', async () => {
    const { ds, injectNpmLib } = setup();
    component('cars, tenants');
    ds.preload(document.body);
    await new Promise((r) => {
      setTimeout(r);
    });
    expect(injectNpmLib.mock.calls.map((c) => c[2])).toEqual([
      'dist/cars.js',
      'dist/tenants.js',
    ]);
  });

  it('builds the request context from the flow state at call time', async () => {
    const cars = makeDs('cars', {
      list: async (ctx, params) =>
        (await ctx.request({ ...ctx, request: undefined, ...params })).data,
    });
    const { ds, post, flowState } = setup({ registry: { cars: cars } });
    const handle = await ask(ds, component(), 'cars');
    flowState.stepId = 'step-2';

    await expect(handle.list({ q: 'x' })).resolves.toEqual({ data: { ok: 1 } });
    expect(post).toHaveBeenCalledWith('/v1/flow/ds/cars', {
      executionId: 'exec-1',
      stepId: 'step-2',
      componentId: 'comp-1',
      componentType: 'descope-thing',
      request: undefined,
      q: 'x',
    });
  });

  it('reports a failed response to the data source as ok: false', async () => {
    const cars = makeDs('cars', { list: async (ctx) => ctx.request({}) });
    const { ds, post } = setup({ registry: { cars: cars } });
    post.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ errorDescription: 'Too many requests' }),
    });
    const handle = await ask(ds, component(), 'cars');
    await expect(handle.list()).resolves.toEqual({
      data: {
        ok: false,
        data: { errorDescription: 'Too many requests' },
        error: 'Too many requests',
      },
    });
  });

  it('turns a throwing method into { error }', async () => {
    const cars = makeDs('cars', {
      list: async () => {
        throw new Error('boom');
      },
      sync: () => {
        throw new Error('sync boom');
      },
    });
    const { ds } = setup({ registry: { cars: cars } });
    const handle = await ask(ds, component(), 'cars');
    await expect(handle.list()).resolves.toEqual({ error: 'boom' });
    await expect(handle.sync()).resolves.toEqual({ error: 'sync boom' });
  });

  it('times out a method that never settles', async () => {
    jest.useFakeTimers();
    const cars = makeDs('cars', { list: () => new Promise(() => {}) });
    const { ds } = setup({ registry: { cars: cars } });
    const handle = await ask(ds, component(), 'cars');
    const result = handle.list();
    jest.advanceTimersByTime(DATA_SOURCE_TIMEOUT_MS);
    await expect(result).resolves.toEqual({ error: 'Data source timed out' });
  });

  it('isolates data sources on the same component', async () => {
    const cars = makeDs('cars', { list: async () => ['volvo'] });
    const { ds } = setup({
      registry: { cars: cars },
      failLoad: ['tenants'],
    });
    const el = component('cars,tenants');

    const [carsHandle, tenantsHandle] = await Promise.all([
      ask(ds, el, 'cars'),
      ask(ds, el, 'tenants'),
    ]);

    expect(tenantsHandle).toBeNull();
    await expect(carsHandle.list()).resolves.toEqual({ data: ['volvo'] });
  });

  it('retries a data source that failed to load on a later request', async () => {
    const { ds, injectNpmLib } = setup({ failLoad: ['cars'] });
    const el = component();
    await expect(ask(ds, el, 'cars')).resolves.toBeNull();
    await ask(ds, el, 'cars');
    expect(injectNpmLib).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['an endpoint outside /v1/flow/ds/', { endpoint: '/v1/mgmt/user/search' }],
    [
      'a full URL endpoint',
      { endpoint: 'https://evil.example/v1/flow/ds/cars' },
    ],
    ['a mismatched name', { name: 'trucks' }],
    ['no methods', { methods: undefined }],
  ])('refuses a data source with %s', async (_, overrides) => {
    const { ds, logger } = setup({
      registry: { cars: makeDs('cars', {}, overrides) },
    });
    await expect(ask(ds, component(), 'cars')).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });

  it('does not answer for an undeclared data source', async () => {
    const { ds, injectNpmLib } = setup();
    await expect(ask(ds, component('cars'), 'tenants')).resolves.toBe(
      'unanswered',
    );
    await expect(ask(ds, component(null), 'cars')).resolves.toBe('unanswered');
    expect(injectNpmLib).not.toHaveBeenCalled();
  });

  it('does not answer without a resolve callback or an element id', async () => {
    const { ds } = setup();
    const event = new CustomEvent('descope-data-source', {
      detail: { name: 'cars' },
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: component() });
    ds.handleEvent(event);
    expect(event.defaultPrevented).toBe(false);
    await expect(ask(ds, component('cars', ''), 'cars')).resolves.toBe(
      'unanswered',
    );
  });
});

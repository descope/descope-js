// @ts-nocheck
import {
  createDataSources,
  getDeclaredNames,
  DATA_SOURCE_TIMEOUT_MS,
} from '../src/lib/helpers/dataSources';

const makeDs = (name, methods, overrides = {}) => ({
  name,
  endpoint: `/v1/flow/ds/${name}`,
  methods,
  ...overrides,
});

const setup = () => {
  const post = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: 1 }),
  }));
  const logger = { debug: jest.fn(), warn: jest.fn() };
  const flowState = { executionId: 'exec-1', stepId: 'step-1' };
  const ds = createDataSources({
    getFlowState: () => flowState,
    post,
    logger,
  });
  return { ds, post, logger, flowState };
};

const component = (declared = 'cars', id = 'comp-1') => {
  const el = document.createElement('descope-thing');
  el.id = id;
  if (declared !== null) el.setAttribute('data-descope-ds', declared);
  document.body.appendChild(el);
  return el;
};

// what the component does: hands its data source over and waits for the handle
const ask = (ds, el, dataSource) =>
  new Promise((resolve) => {
    const event = new CustomEvent('descope-data-source', {
      detail: { dataSource, resolve },
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: el });
    ds.handleEvent(event);
    if (!event.defaultPrevented) resolve('unanswered');
  });

afterEach(() => {
  document.body.innerHTML = '';
  jest.useRealTimers();
});

describe('getDeclaredNames', () => {
  it('trims, dedupes and drops invalid names', () => {
    const el = component(' cars , tenants, cars ,, Bad Name, ../x, cars@2');
    expect(getDeclaredNames(el)).toEqual(['cars', 'tenants']);
  });
});

describe('createDataSources', () => {
  it('builds the request context from the flow state at call time', async () => {
    const cars = makeDs('cars', {
      list: async (ctx, params) =>
        (await ctx.request({ ...ctx, request: undefined, ...params })).data,
    });
    const { ds, post, flowState } = setup();
    const handle = await ask(ds, component(), cars);
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

  it('hands out a frozen handle with only the methods', async () => {
    const cars = makeDs('cars', { list: async () => 1, notAMethod: 'x' });
    const { ds } = setup();
    const handle = await ask(ds, component(), cars);
    expect(Object.isFrozen(handle)).toBe(true);
    expect(Object.keys(handle)).toEqual(['list']);
  });

  it('reports a failed response to the data source as ok: false', async () => {
    const cars = makeDs('cars', { list: async (ctx) => ctx.request({}) });
    const { ds, post } = setup();
    post.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ errorDescription: 'Too many requests' }),
    });
    const handle = await ask(ds, component(), cars);
    await expect(handle.list()).resolves.toEqual({
      data: {
        ok: false,
        data: { errorDescription: 'Too many requests' },
        error: 'Too many requests',
      },
    });
  });

  it('reports a request that throws as ok: false', async () => {
    const cars = makeDs('cars', { list: async (ctx) => ctx.request({}) });
    const { ds, post } = setup();
    post.mockRejectedValue(new Error('offline'));
    const handle = await ask(ds, component(), cars);
    await expect(handle.list()).resolves.toEqual({
      data: { ok: false, error: 'offline' },
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
    const { ds, logger } = setup();
    const handle = await ask(ds, component(), cars);
    await expect(handle.list()).resolves.toEqual({ error: 'boom' });
    await expect(handle.sync()).resolves.toEqual({ error: 'sync boom' });
    expect(logger.warn).toHaveBeenCalledWith(
      'Data source "cars.list" failed',
      'boom',
    );
  });

  it('times out a method that never settles', async () => {
    jest.useFakeTimers();
    const cars = makeDs('cars', { list: () => new Promise(() => {}) });
    const { ds } = setup();
    const handle = await ask(ds, component(), cars);
    const result = handle.list();
    jest.advanceTimersByTime(DATA_SOURCE_TIMEOUT_MS);
    await expect(result).resolves.toEqual({ error: 'Data source timed out' });
  });

  it('answers each declared data source on the same component', async () => {
    const { ds } = setup();
    const el = component('cars,tenants');
    const [cars, tenants] = await Promise.all([
      ask(ds, el, makeDs('cars', { list: async () => ['volvo'] })),
      ask(ds, el, makeDs('tenants', { list: async () => ['acme'] })),
    ]);
    await expect(cars.list()).resolves.toEqual({ data: ['volvo'] });
    await expect(tenants.list()).resolves.toEqual({ data: ['acme'] });
  });

  it.each([
    ['an endpoint outside /v1/flow/ds/', { endpoint: '/v1/mgmt/user/search' }],
    [
      'a full URL endpoint',
      { endpoint: 'https://evil.example/v1/flow/ds/cars' },
    ],
    ['an invalid name', { name: '../cars' }],
    ['no methods', { methods: undefined }],
  ])('refuses a data source with %s', async (_, overrides) => {
    const { ds, post } = setup();
    await expect(
      ask(ds, component('cars,../cars'), makeDs('cars', {}, overrides)),
    ).resolves.toBe('unanswered');
    expect(post).not.toHaveBeenCalled();
  });

  it.each([[null], [undefined], ['cars']])(
    'refuses a data source that is not an object (%p)',
    async (dataSource) => {
      const { ds } = setup();
      await expect(ask(ds, component(), dataSource)).resolves.toBe(
        'unanswered',
      );
    },
  );

  it('does not answer for an undeclared data source', async () => {
    const { ds } = setup();
    await expect(
      ask(ds, component('cars'), makeDs('tenants', {})),
    ).resolves.toBe('unanswered');
    await expect(ask(ds, component(null), makeDs('cars', {}))).resolves.toBe(
      'unanswered',
    );
  });

  it('does not answer without a resolve callback or an element id', async () => {
    const { ds } = setup();
    const event = new CustomEvent('descope-data-source', {
      detail: { dataSource: makeDs('cars', {}) },
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: component() });
    ds.handleEvent(event);
    expect(event.defaultPrevented).toBe(false);
    await expect(
      ask(ds, component('cars', ''), makeDs('cars', {})),
    ).resolves.toBe('unanswered');
  });
});

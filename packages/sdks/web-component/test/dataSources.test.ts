// @ts-nocheck
import { createDataSources } from '../src/lib/helpers/dataSources';

const setup = () => {
  const post = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: 1 }),
  }));
  const logger = { debug: jest.fn() };
  const flowState = { executionId: 'exec-1', stepId: 'step-1' };
  const ds = createDataSources({
    getFlowState: () => flowState,
    post,
    logger,
  });
  return { ds, post, flowState };
};

const component = (id = 'comp-1') => {
  const el = document.createElement('descope-thing');
  el.id = id;
  document.body.appendChild(el);
  return el;
};

// what the component does: asks for a data source by name and waits for its request function
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
  document.body.innerHTML = '';
});

describe('createDataSources', () => {
  it('posts to the endpoint of the name with the flow and component identity', async () => {
    const { ds, post, flowState } = setup();
    const request = await ask(ds, component(), 'cars');
    flowState.stepId = 'step-2';

    await expect(request({ q: 'x' })).resolves.toEqual({
      ok: true,
      data: { ok: 1 },
    });
    expect(post).toHaveBeenCalledWith('/v1/flow/ds/cars', {
      q: 'x',
      executionId: 'exec-1',
      stepId: 'step-2',
      componentId: 'comp-1',
      componentType: 'descope-thing',
    });
  });

  it('does not let the body override the flow and component identity', async () => {
    const { ds, post } = setup();
    const request = await ask(ds, component(), 'cars');
    await request({ executionId: 'x', stepId: 'x', componentId: 'x' });
    expect(post.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        executionId: 'exec-1',
        stepId: 'step-1',
        componentId: 'comp-1',
      }),
    );
  });

  it('reports a failed response as ok: false', async () => {
    const { ds, post } = setup();
    post.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ errorDescription: 'Too many requests' }),
    });
    const request = await ask(ds, component(), 'cars');
    await expect(request({})).resolves.toEqual({
      ok: false,
      data: { errorDescription: 'Too many requests' },
      error: 'Too many requests',
    });
  });

  it('reports a request that throws as ok: false', async () => {
    const { ds, post } = setup();
    post.mockRejectedValue(new Error('offline'));
    const request = await ask(ds, component(), 'cars');
    await expect(request({})).resolves.toEqual({ ok: false, error: 'offline' });
  });

  it('answers each name on the same component', async () => {
    const { ds, post } = setup();
    const el = component();
    const [cars, tenants] = await Promise.all([
      ask(ds, el, 'cars'),
      ask(ds, el, 'tenants'),
    ]);
    await cars({});
    await tenants({});
    expect(post.mock.calls.map(([path]) => path)).toEqual([
      '/v1/flow/ds/cars',
      '/v1/flow/ds/tenants',
    ]);
  });

  it.each([
    ['../cars'],
    ['Cars'],
    ['cars/x'],
    [''],
    [undefined],
    [{ name: 'cars' }],
  ])('does not answer for an invalid name (%p)', async (name) => {
    const { ds, post } = setup();
    await expect(ask(ds, component(), name)).resolves.toBe('unanswered');
    expect(post).not.toHaveBeenCalled();
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
    await expect(ask(ds, component(''), 'cars')).resolves.toBe('unanswered');
  });
});

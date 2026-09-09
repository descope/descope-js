import {
  deriveValidationRule,
  validationTrackingMixin,
} from '../validationTrackingMixin';

const makeInput = (
  name: string,
  validity: Partial<ValidityState>,
  message = 'msg',
): HTMLInputElement =>
  ({
    getAttribute: (attr: string) => (attr === 'name' ? name : null),
    validity: validity as ValidityState,
    validationMessage: message,
  }) as unknown as HTMLInputElement;

// A minimal host that composes the mixin. It provides `sdk` (read by the mixin
// for transport) and a `currentFlowContext` that the tests pass into
// trackValidationErrors, mirroring how DescopeWc calls it.
class TestHost extends validationTrackingMixin(HTMLElement) {
  currentFlowContext: {
    executionId?: string;
    screenId?: string;
    screenName?: string;
  } = { executionId: 'e1', screenId: 'scr-1', screenName: 'Sign in' };

  sdk: any = {
    httpClient: { buildUrl: (path: string) => `https://api.test${path}` },
  };

  // Mirror DescopeWc: forward disconnect into the mixin teardown.
  disconnectedCallback() {
    this.teardownValidationTracking();
  }
}
customElements.define('vt-test-host', TestHost);

// A host exactly as constructed, with the setter never called.
const mountRaw = (): TestHost => {
  const el = document.createElement('vt-test-host') as TestHost;
  el.setAttribute('project-id', 'p1');
  document.body.appendChild(el);
  return el;
};

// Mounts a host with tracking already switched on, which is what DescopeWc does
// for a flow whose config enables it. The mixin itself starts off - see the
// "captures nothing until it is switched on" test, which never calls the setter.
const mount = (): TestHost => {
  const el = mountRaw();
  el.setValidationTrackingEnabled(true);
  return el;
};

describe('deriveValidationRule', () => {
  it('maps native validity flags to coarse rules', () => {
    expect(deriveValidationRule({ valueMissing: true } as ValidityState)).toBe(
      'required',
    );
    // type/pattern/badInput all collapse into a single `format` bucket
    expect(deriveValidationRule({ typeMismatch: true } as ValidityState)).toBe(
      'format',
    );
    expect(
      deriveValidationRule({ patternMismatch: true } as ValidityState),
    ).toBe('format');
    expect(deriveValidationRule({ badInput: true } as ValidityState)).toBe(
      'format',
    );
    expect(deriveValidationRule({ tooShort: true } as ValidityState)).toBe(
      'too-short',
    );
    expect(deriveValidationRule({ rangeOverflow: true } as ValidityState)).toBe(
      'range',
    );
    expect(deriveValidationRule({ customError: true } as ValidityState)).toBe(
      'custom',
    );
  });

  it('prefers the higher-precedence flag when several are set', () => {
    // an invalid email trips both typeMismatch and patternMismatch -> format
    expect(
      deriveValidationRule({
        typeMismatch: true,
        patternMismatch: true,
      } as ValidityState),
    ).toBe('format');
    // required wins over everything
    expect(
      deriveValidationRule({
        valueMissing: true,
        patternMismatch: true,
      } as ValidityState),
    ).toBe('required');
  });

  it('returns unknown when there is no validity or no flag set', () => {
    expect(deriveValidationRule(undefined)).toBe('unknown');
    expect(deriveValidationRule({} as ValidityState)).toBe('unknown');
  });
});

describe('validationTrackingMixin', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({});
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('captures nothing until it is switched on', () => {
    // The setter is never called here - this is the shipped default, and the
    // reason a flow whose config says nothing sends nothing.
    const el = mountRaw();
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));
    window.dispatchEvent(new Event('pagehide'));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('drops what it buffered when it is switched off', () => {
    const el = mount();
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );

    el.setValidationTrackingEnabled(false);
    // Every flush trigger, and nothing should go out.
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));
    window.dispatchEvent(new Event('pagehide'));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('captures again after being switched back on', () => {
    const el = mount();
    el.setValidationTrackingEnabled(false);
    el.setValidationTrackingEnabled(true);

    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('batches and POSTs to the resolved /v1/flow/event URL on flush', () => {
    const el = mount();
    el.trackValidationErrors(
      [
        makeInput(
          'email',
          { valueMissing: true },
          'Please fill out this field',
        ),
      ],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    // uses the SDK-resolved (region-aware) URL, not a reconstructed one
    expect(url).toBe('https://api.test/v1/flow/event');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer p1');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ executionId: 'e1' });
    // Validation happens on screens - there is no step in this model.
    expect(body.stepId).toBeUndefined();
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      field: 'email',
      rule: 'required',
      message: 'Please fill out this field',
      screenId: 'scr-1',
      screenName: 'Sign in',
    });
    expect(body.events[0].id).toBeTruthy();
    expect(typeof body.events[0].ts).toBe('number');
  });

  it('dedupes the same field+rule within a batch (blur + submit double-fire)', () => {
    const el = mount();
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events).toHaveLength(1);
  });

  it('keeps distinct fields/rules in the same batch', () => {
    const el = mount();
    el.trackValidationErrors(
      [
        makeInput('email', { valueMissing: true }),
        makeInput('password', { tooShort: true }),
      ],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events).toHaveLength(2);
  });

  it('holds start-screen errors until the flow has an execution', () => {
    const el = mount();
    // Start screen: config-rendered, so no execution yet.
    el.trackValidationErrors([makeInput('email', { typeMismatch: true })], {
      executionId: '',
      screenId: 'start-scr',
      screenName: 'Welcome Screen',
    });
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));
    expect(fetchMock).not.toHaveBeenCalled();

    // The user fixes the input and continues - the flow now has an execution.
    el.setValidationTrackingExecution('e1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.executionId).toBe('e1');
    expect(body.events).toHaveLength(1);
    expect(body.events[0].field).toBe('email');
    // The event keeps the screen it was captured on.
    expect(body.events[0].screenId).toBe('start-scr');
    expect(body.events[0].screenName).toBe('Welcome Screen');
  });

  it('drops held start-screen errors if the flow never starts', () => {
    const el = mount();
    el.trackValidationErrors([makeInput('email', { typeMismatch: true })], {
      executionId: '',
      screenId: 'start-scr',
      screenName: 'Welcome Screen',
    });

    el.remove(); // the user gave up and left

    window.dispatchEvent(new Event('pagehide'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not hold anything while tracking is off', () => {
    const el = mountRaw();
    el.trackValidationErrors([makeInput('email', { typeMismatch: true })], {
      executionId: '',
      screenId: 'start-scr',
      screenName: 'Welcome Screen',
    });
    el.setValidationTrackingEnabled(true);
    el.setValidationTrackingExecution('e1');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing while there is no live execution, whatever fires', () => {
    const el = mount();
    el.currentFlowContext = { executionId: undefined };
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    // every flush trigger - the endpoint would reject a batch with no execution
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));
    el.dispatchEvent(new CustomEvent('error', { detail: {} }));
    window.dispatchEvent(new Event('pagehide'));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the screen an event was captured on when it is adopted later', () => {
    const el = mount();
    el.trackValidationErrors([makeInput('email', { typeMismatch: true })], {
      executionId: '',
      screenId: 'start-scr',
      screenName: 'Welcome Screen',
    });

    // By the time the flow starts it is on a different screen - the held event
    // still belongs to the one the user actually saw.
    el.currentFlowContext = {
      executionId: 'e1',
      screenId: 'scr-2',
      screenName: 'Verify',
    };
    el.setValidationTrackingExecution(el.currentFlowContext.executionId);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events[0].screenId).toBe('start-scr');
    expect(body.events[0].screenName).toBe('Welcome Screen');
  });

  it('does not send held events twice if adoption runs again', () => {
    const el = mount();
    el.trackValidationErrors([makeInput('email', { typeMismatch: true })], {
      executionId: '',
      screenId: 'start-scr',
      screenName: 'Welcome Screen',
    });

    el.setValidationTrackingExecution('e1');
    el.setValidationTrackingExecution('e1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caps what it holds so an abandoned start screen cannot grow forever', () => {
    const el = mount();
    // 25 distinct failures, cap is 20
    for (let i = 0; i < 25; i += 1) {
      el.trackValidationErrors(
        [makeInput(`field-${i}`, { valueMissing: true })],
        {
          executionId: '',
          screenId: 'start-scr',
          screenName: 'Welcome Screen',
        },
      );
    }

    el.setValidationTrackingExecution('e1');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events).toHaveLength(20);
  });

  it('dedupes the same failure while holding (blur + submit on the start screen)', () => {
    const el = mount();
    const ctx = {
      executionId: '',
      screenId: 'start-scr',
      screenName: 'Welcome Screen',
    };
    el.trackValidationErrors([makeInput('email', { typeMismatch: true })], ctx);
    el.trackValidationErrors([makeInput('email', { typeMismatch: true })], ctx);

    el.setValidationTrackingExecution('e1');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events).toHaveLength(1);
  });

  it('captures a blur-only failure and sends on flush (abandonment via page hide, keepalive)', () => {
    const el = mount();
    // only a blur failure, no submit
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    window.dispatchEvent(new Event('pagehide'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].keepalive).toBe(true);
  });

  it('sends the batch when the screen changes, and starts a fresh one', () => {
    const el = mount();
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );

    // The component signals a screen change - that is what closes a batch.
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const first = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(first.events).toHaveLength(1);
    expect(first.events[0].screenId).toBe('scr-1');

    el.currentFlowContext = {
      executionId: 'e1',
      screenId: 'scr-2',
      screenName: 'Screen 2',
    };
    el.trackValidationErrors(
      [makeInput('phone', { valueMissing: true })],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.events).toHaveLength(1);
    expect(second.events[0].screenId).toBe('scr-2');
  });

  it('keeps each event on its own screen if a batch spans two', () => {
    const el = mount();
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    // Same batch, different screen - the batch has no screen of its own, so
    // this is fine and each event stays truthful.
    el.trackValidationErrors([makeInput('phone', { valueMissing: true })], {
      executionId: 'e1',
      screenId: 'scr-2',
      screenName: 'Screen 2',
    });
    window.dispatchEvent(new Event('pagehide'));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events.map((e: any) => e.screenId)).toEqual(['scr-1', 'scr-2']);
  });

  it('retries a failed non-unload send, then stops on success', async () => {
    jest.useFakeTimers();
    fetchMock
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ ok: true });
    const el = mount();

    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));

    expect(fetchMock).toHaveBeenCalledTimes(1); // first attempt
    await Promise.resolve();
    await Promise.resolve(); // let the rejection's .catch schedule the retry
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2); // retried once

    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2); // 2nd attempt succeeded -> no more retries
    jest.useRealTimers();
  });

  it('cancels a pending retry when the component disconnects', async () => {
    jest.useFakeTimers();
    fetchMock.mockRejectedValue(new Error('network'));
    const el = mount();

    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));

    expect(fetchMock).toHaveBeenCalledTimes(1); // first attempt
    await Promise.resolve();
    await Promise.resolve(); // let the rejection's .catch schedule the retry

    el.remove(); // teardown while the retry is still waiting out its backoff

    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1); // retry never fired
    jest.useRealTimers();
  });

  it('does not retry a rejected batch (4xx)', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue({ ok: false, status: 400 });
    const el = mount();

    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    // A 400 will not become a 200 - one attempt only.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('stops retrying a batch when tracking is switched off mid-flight', async () => {
    jest.useFakeTimers();
    fetchMock.mockRejectedValue(new Error('network'));
    const el = mount();

    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} }));
    expect(fetchMock).toHaveBeenCalledTimes(1); // first attempt, in flight

    // The customer turns it off before the failure comes back.
    el.setValidationTrackingEnabled(false);
    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry after the switch
    jest.useRealTimers();
  });

  it('does not retry the unload (page-hide) send', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const el = mount();
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    window.dispatchEvent(new Event('pagehide'));

    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1); // keepalive, single shot
    expect(fetchMock.mock.calls[0][1].keepalive).toBe(true);
  });

  it('never throws out of trackValidationErrors', () => {
    const el = mount();
    // buildUrl throwing must be swallowed
    el.sdk = {
      httpClient: {
        buildUrl: () => {
          throw new Error('boom');
        },
      },
    };
    el.trackValidationErrors(
      [makeInput('email', { valueMissing: true })],
      el.currentFlowContext,
    );
    expect(() =>
      el.dispatchEvent(new CustomEvent('screen-updated', { detail: {} })),
    ).not.toThrow();
  });
});

import createSdk from '../src/index';
import {
  FLOW_NONCE_HEADER,
  FLOW_NONCE_PREFIX,
  FLOW_NEXT_TTL,
} from '../src/enhancers/withFlowNonce/constants';

/**
 * Regression tests for descope/etc#15600.
 *
 * Original bug: withFlowNonce read the nonce from localStorage synchronously
 * per request with no in-flight tracking. Two concurrent flow.next() calls for
 * the same executionId both saw the same nonce, the server rotated atomically
 * on the first, and the second was rejected with E108201.
 *
 * Fix: per-executionId in-flight serialization in withFlowNonce. A new call
 * awaits the previous in-flight promise for the same executionId before
 * reading the nonce. The chain forms synchronously in beforeRequest so
 * sibling calls in the same tick stack deterministically.
 */
describe('flowNonce race (descope/etc#15600)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  const seedNonce = (executionId: string, nonce: string) => {
    const key = `${FLOW_NONCE_PREFIX}${executionId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        value: nonce,
        expiry: Date.now() + FLOW_NEXT_TTL * 1000,
        isStart: false,
      }),
    );
  };

  const captureNonceHeader = (options: RequestInit): string | null => {
    const headers = options.headers as
      | Record<string, string>
      | Headers
      | undefined;
    if (!headers) return null;
    if (headers instanceof Headers) return headers.get(FLOW_NONCE_HEADER);
    const key = Object.keys(headers).find(
      (k) => k.toLowerCase() === FLOW_NONCE_HEADER.toLowerCase(),
    );
    return key ? (headers as Record<string, string>)[key] : null;
  };

  const buildResponse = (executionId: string, nonce: string | null) => {
    const headers = new Headers();
    if (nonce) headers.set(FLOW_NONCE_HEADER, nonce);
    return {
      status: 200,
      ok: true,
      json: () => Promise.resolve({ executionId: `flow|#|${executionId}` }),
      text: () =>
        Promise.resolve(
          JSON.stringify({ executionId: `flow|#|${executionId}` }),
        ),
      clone() {
        return this;
      },
      headers,
    } as unknown as Response;
  };

  it('serializes two concurrent flow.next calls so the second sends the rotated nonce', async () => {
    const executionId = 'race-exec-id';
    const initialNonce = 'NONCE_V1';
    const rotatedNonce = 'NONCE_V2';
    seedNonce(executionId, initialNonce);

    let callIdx = 0;
    const fetchMock = jest.fn().mockImplementation(async () => {
      const idx = callIdx++;
      await new Promise((r) => setTimeout(r, 200));
      return buildResponse(executionId, idx === 0 ? rotatedNonce : null);
    });
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });

    const call1 = sdk.flow.next(`flow|#|${executionId}`, 'step', 'submit');
    const call2 = sdk.flow.next(`flow|#|${executionId}`, 'step', 'polling');

    await Promise.all([call1, call2]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const nonce1 = captureNonceHeader(fetchMock.mock.calls[0][1]);
    const nonce2 = captureNonceHeader(fetchMock.mock.calls[1][1]);

    expect(nonce1).toBe(initialNonce);
    expect(nonce2).toBe(rotatedNonce);
    expect(nonce1).not.toBe(nonce2);
  });

  it('serializes a 120ms-gap double submit (debounce expired, fetch still pending)', async () => {
    const executionId = 'debounce-exec-id';
    const initialNonce = 'NONCE_V1';
    const rotatedNonce = 'NONCE_V2';
    seedNonce(executionId, initialNonce);

    let callIdx = 0;
    const fetchMock = jest.fn().mockImplementation(async () => {
      const idx = callIdx++;
      await new Promise((r) => setTimeout(r, 300));
      return buildResponse(executionId, idx === 0 ? rotatedNonce : null);
    });
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });

    const call1 = sdk.flow.next(`flow|#|${executionId}`, 'step', 'submit');
    await new Promise((r) => setTimeout(r, 120));
    const call2 = sdk.flow.next(`flow|#|${executionId}`, 'step', 'submit');

    await Promise.all([call1, call2]);

    const nonce1 = captureNonceHeader(fetchMock.mock.calls[0][1]);
    const nonce2 = captureNonceHeader(fetchMock.mock.calls[1][1]);
    expect(nonce1).toBe(initialNonce);
    expect(nonce2).toBe(rotatedNonce);
  });

  it('control: sequential await rotates nonce correctly', async () => {
    const executionId = 'sequential-exec-id';
    const initialNonce = 'NONCE_V1';
    const rotatedNonce = 'NONCE_V2';
    seedNonce(executionId, initialNonce);

    let callIdx = 0;
    const fetchMock = jest.fn().mockImplementation(async () => {
      const idx = callIdx++;
      return buildResponse(executionId, idx === 0 ? rotatedNonce : null);
    });
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });

    await sdk.flow.next(`flow|#|${executionId}`, 'step', 'submit');
    await sdk.flow.next(`flow|#|${executionId}`, 'step', 'submit');

    const nonce1 = captureNonceHeader(fetchMock.mock.calls[0][1]);
    const nonce2 = captureNonceHeader(fetchMock.mock.calls[1][1]);
    expect(nonce1).toBe(initialNonce);
    expect(nonce2).toBe(rotatedNonce);
  });

  it('releases the chain when flow.next rejects so the next call can run', async () => {
    const executionId = 'reject-exec-id';
    seedNonce(executionId, 'NONCE_V1');

    let callIdx = 0;
    const fetchMock = jest.fn().mockImplementation(async () => {
      const idx = callIdx++;
      if (idx === 0) {
        await new Promise((r) => setTimeout(r, 20));
        throw new Error('network down');
      }
      return buildResponse(executionId, null);
    });
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });

    await expect(
      sdk.flow.next(`flow|#|${executionId}`, 'step', 'submit'),
    ).rejects.toBeDefined();

    await expect(
      sdk.flow.next(`flow|#|${executionId}`, 'step', 'submit'),
    ).resolves.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

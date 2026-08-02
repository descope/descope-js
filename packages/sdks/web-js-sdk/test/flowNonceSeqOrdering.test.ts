import createSdk from '../src/index';
import {
  FLOW_NONCE_PREFIX,
  FLOW_NONCE_HEADER,
} from '../src/enhancers/withFlowNonce/constants';
import {
  parseNonceSeq,
  maxSeq,
} from '../src/enhancers/withFlowNonce/helpers';

// Sequence-based write ordering for the shared flow-nonce store
// (descope/etc#17286). The server prefixes each nonce with a monotonic
// per-execution sequence ("<seq>.<random>"). The client keeps the highest
// seen so the newest nonce wins regardless of network arrival order, and
// retains that high-water mark across unsequenced writes.

const EXEC = 'seq-execution-id';
const FULL = `flow|#|${EXEC}`;
const KEY = `${FLOW_NONCE_PREFIX}${EXEC}`;

// Build a sequenced nonce value the way the server does.
const N = (seq: number | null, random = 'ygzG6QEt') =>
  seq === null ? random : `${seq}.${random}`;

function resp(nonce: string | null) {
  const headers = new Headers();
  if (nonce) headers.set(FLOW_NONCE_HEADER, nonce);
  return {
    status: 200,
    ok: true,
    json: () => Promise.resolve({ executionId: FULL }),
    text: () => Promise.resolve(JSON.stringify({ executionId: FULL })),
    clone() {
      return this;
    },
    headers,
  };
}

function record(): { value: string; seq?: number } | null {
  const i = localStorage.getItem(KEY);
  return i ? { value: JSON.parse(i).value, seq: JSON.parse(i).seq } : null;
}

function seed(value: string, seq?: number) {
  localStorage.setItem(
    KEY,
    JSON.stringify({ value, expiry: Date.now() + 3.6e6, isStart: false, seq }),
  );
}

function deferred() {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('parseNonceSeq', () => {
  it('parses a canonical non-negative integer prefix', () => {
    expect(parseNonceSeq('7.abc')).toBe(7);
    expect(parseNonceSeq('0.abc')).toBe(0);
  });
  it('returns undefined for a plain nonce', () => {
    expect(parseNonceSeq('abc')).toBeUndefined();
  });
  it('rejects malformed / out-of-range prefixes', () => {
    expect(parseNonceSeq('.abc')).toBeUndefined();
    expect(parseNonceSeq('-1.abc')).toBeUndefined();
    expect(parseNonceSeq('1e308.abc')).toBeUndefined();
    expect(parseNonceSeq('99999999999999999999.abc')).toBeUndefined();
    expect(parseNonceSeq(' 3.abc')).toBeUndefined();
  });
});

describe('maxSeq', () => {
  it('returns the higher defined value, or undefined when both unset', () => {
    expect(maxSeq(3, 5)).toBe(5);
    expect(maxSeq(5, undefined)).toBe(5);
    expect(maxSeq(undefined, 2)).toBe(2);
    expect(maxSeq(undefined, undefined)).toBeUndefined();
  });
});

describe('flowNonce sequence write ordering', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('higher sequence overwrites', async () => {
    seed(N(4), 4);
    global.fetch = jest.fn().mockResolvedValue(resp(N(5)));
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.next(FULL, 'step', 'polling');
    expect(record()).toEqual({ value: N(5), seq: 5 });
  });

  it('lower sequence is skipped (the stale stomp)', async () => {
    seed(N(6), 6);
    global.fetch = jest.fn().mockResolvedValue(resp(N(3)));
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.next(FULL, 'step', 'polling');
    expect(record()).toEqual({ value: N(6), seq: 6 });
  });

  it('equal sequence is skipped (idempotent)', async () => {
    seed(N(5), 5);
    global.fetch = jest.fn().mockResolvedValue(resp(N(5, 'other')));
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.next(FULL, 'step', 'polling');
    expect(record()).toEqual({ value: N(5), seq: 5 });
  });

  it('client stores and echoes the full sequenced nonce value', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(resp(N(1)))
      .mockResolvedValueOnce(resp(N(2)));
    global.fetch = fetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.next(FULL, 'step', 'submit');
    expect(record()).toEqual({ value: N(1), seq: 1 });

    await sdk.flow.next(FULL, 'step', 'submit');
    const sent = fetch.mock.calls[1][1].headers;
    expect(sent[FLOW_NONCE_HEADER] ?? sent.get?.(FLOW_NONCE_HEADER)).toBe(N(1));
  });

  it('burn boundary, either arrival order: highest-sequence post-burn nonce wins', async () => {
    seed(N(4), 4);
    const slowP1 = deferred();
    const slowV = deferred();

    global.fetch = jest.fn().mockImplementation(() => slowP1.promise);
    const A = createSdk({ projectId: 'pid' });
    const pA = A.flow.next(FULL, 'step', 'polling');

    global.fetch = jest.fn().mockImplementation(() => slowV.promise);
    const B = createSdk({ projectId: 'pid' });
    const pB = B.flow.next(FULL, 'step', 'submit');

    slowP1.resolve(resp(N(5, 'pre'))); // pre-burn, lower seq
    await pA;
    slowV.resolve(resp(N(6, 'burn'))); // post-burn, sole valid, higher seq
    await pB;

    expect(record()).toEqual({ value: N(6, 'burn'), seq: 6 });
  });

  it('burn boundary, reverse arrival order: verify first, late poll skipped', async () => {
    seed(N(4), 4);
    const slowP1 = deferred();
    const slowV = deferred();

    global.fetch = jest.fn().mockImplementation(() => slowP1.promise);
    const A = createSdk({ projectId: 'pid' });
    const pA = A.flow.next(FULL, 'step', 'polling');

    global.fetch = jest.fn().mockImplementation(() => slowV.promise);
    const B = createSdk({ projectId: 'pid' });
    const pB = B.flow.next(FULL, 'step', 'submit');

    slowV.resolve(resp(N(6, 'burn')));
    await pB;
    slowP1.resolve(resp(N(5, 'pre')));
    await pA;

    expect(record()).toEqual({ value: N(6, 'burn'), seq: 6 });
  });

  it('unsequenced write does NOT erase the high-water mark', async () => {
    // Mixed execution: store at seq 10, then a plain (unsequenced) newer nonce
    // arrives and wins by LWW, but the mark must survive so a later stale
    // seq-9 nonce is still rejected instead of reopening the race.
    seed(N(10), 10);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(resp(N(null, 'plain11')))
      .mockResolvedValueOnce(resp(N(9, 'stale')));
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.next(FULL, 'step', 'polling');
    expect(record()).toEqual({ value: 'plain11', seq: 10 });

    await sdk.flow.next(FULL, 'step', 'polling');
    expect(record()).toEqual({ value: 'plain11', seq: 10 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('flow start always writes and resets the mark to its own sequence', async () => {
    seed(N(9), 9);
    global.fetch = jest.fn().mockResolvedValue(resp(N(1, 'start')));
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.start('flow');
    expect(record()).toEqual({ value: N(1, 'start'), seq: 1 });
  });

  describe('sequence-absent fallback (feature off / older server)', () => {
    it('both sides unsequenced -> last-writer-wins, no mark', async () => {
      seed('N0');
      global.fetch = jest.fn().mockResolvedValue(resp('N1'));
      const sdk = createSdk({ projectId: 'pid' });
      await sdk.flow.next(FULL, 'step', 'polling');
      expect(record()).toEqual({ value: 'N1', seq: undefined });
    });

    it('first sequenced nonce sets the mark', async () => {
      seed('N0');
      global.fetch = jest.fn().mockResolvedValue(resp(N(7)));
      const sdk = createSdk({ projectId: 'pid' });
      await sdk.flow.next(FULL, 'step', 'polling');
      expect(record()).toEqual({ value: N(7), seq: 7 });
    });
  });

  it('empty store: first nonce is written', async () => {
    global.fetch = jest.fn().mockResolvedValue(resp(N(1)));
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.next(FULL, 'step', 'submit');
    expect(record()).toEqual({ value: N(1), seq: 1 });
  });

  it('Web Locks rejection still writes (no lost update)', async () => {
    const original = (globalThis.navigator as any).locks;
    (globalThis.navigator as any).locks = {
      request: () => Promise.reject(new Error('lock denied')),
    };
    try {
      seed(N(1), 1);
      global.fetch = jest.fn().mockResolvedValue(resp(N(2)));
      const sdk = createSdk({ projectId: 'pid' });
      await sdk.flow.next(FULL, 'step', 'polling');
      expect(record()).toEqual({ value: N(2), seq: 2 });
    } finally {
      (globalThis.navigator as any).locks = original;
    }
  });
});

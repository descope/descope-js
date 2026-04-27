import { decodeProjectCreatedAt } from '../src';

describe('decodeProjectCreatedAt', () => {
  it('returns null for empty string', () => {
    expect(decodeProjectCreatedAt('')).toBeNull();
  });

  it('returns null when string is shorter than 27 chars', () => {
    expect(decodeProjectCreatedAt('short')).toBeNull();
    expect(decodeProjectCreatedAt('pid')).toBeNull();
    expect(decodeProjectCreatedAt('P' + '0'.repeat(25))).toBeNull();
  });

  it('returns null when last 27 chars contain a non-base62 character', () => {
    // '_' and '!' are not in the base62 alphabet
    expect(decodeProjectCreatedAt('P_00000000000000000000000000')).toBeNull();
    expect(decodeProjectCreatedAt('P00000000000000000000000000!')).toBeNull();
  });

  it('returns KSUID epoch (1_400_000_000) for all-zero KSUID body', () => {
    // 27 zeros → 20 zero bytes → timestamp 0 → Unix ts = KSUID_EPOCH
    expect(decodeProjectCreatedAt('P' + '0'.repeat(27))).toBe(1_400_000_000);
    // Same result with a 5-char prefix
    expect(decodeProjectCreatedAt('Peuc1' + '0'.repeat(27))).toBe(
      1_400_000_000,
    );
  });

  it('returns a valid timestamp for a 28-char project ID (1-char prefix + 27-char KSUID)', () => {
    const ts = decodeProjectCreatedAt('P2My9KRakUMj40L8KOBjAJLVWhWC');
    expect(ts).not.toBeNull();
    expect(ts).toBeGreaterThan(1_400_000_000); // after KSUID epoch (2014)
    expect(ts).toBeLessThan(2_000_000_000); // before 2033
  });

  it('returns a valid timestamp for a 32-char project ID (5-char prefix + 27-char KSUID)', () => {
    const ts = decodeProjectCreatedAt('Peuc12xciZCJzdRCXtRxJQEK0wDpKupo');
    expect(ts).not.toBeNull();
    expect(ts).toBeGreaterThan(1_400_000_000);
    expect(ts).toBeLessThan(2_000_000_000);
  });

  it('extracts timestamp from the last 27 chars regardless of prefix length', () => {
    const suffix27 = '2My9KRakUMj40L8KOBjAJLVWhWC';
    const ts28 = decodeProjectCreatedAt('P' + suffix27);
    const ts32 = decodeProjectCreatedAt('Peuc1' + suffix27);
    expect(ts28).toBe(ts32);
  });
});

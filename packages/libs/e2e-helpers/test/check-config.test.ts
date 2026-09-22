import { checkPlaywrightConfig } from '../src/check-config';

// A guard that cannot fail is worse than no guard, so each invariant is tested
// from both sides: it passes on a good config and throws on a bad one.
const validConfig = {
  retries: 2,
  workers: 4,
  expect: { timeout: 15_000 },
  webServer: [
    { command: 'serve components', url: 'http://localhost:3001/umd/index.js' },
    { command: 'serve build', url: 'http://localhost:3002' },
  ],
};

const baseline = { maxRetries: 2, minWorkers: 4 };

describe('checkPlaywrightConfig', () => {
  it('accepts a config that meets every invariant', () => {
    expect(() => checkPlaywrightConfig(validConfig, baseline)).not.toThrow();
  });

  it('accepts a single webServer object rather than an array', () => {
    expect(() =>
      checkPlaywrightConfig(
        { ...validConfig, webServer: { command: 'serve', port: 3002 } },
        baseline,
      ),
    ).not.toThrow();
  });

  it('rejects a webServer with no url or port', () => {
    expect(() =>
      checkPlaywrightConfig(
        {
          ...validConfig,
          webServer: [
            { command: 'serve components' },
            { command: 'serve build', url: 'http://localhost:3002' },
          ],
        },
        baseline,
      ),
    ).toThrow(/webServer\[0\] has no url or port/);
  });

  it('accepts a webServer that uses port instead of url', () => {
    expect(() =>
      checkPlaywrightConfig(
        { ...validConfig, webServer: [{ command: 'serve', port: 3001 }] },
        baseline,
      ),
    ).not.toThrow();
  });

  it('rejects a missing expect.timeout', () => {
    const { expect: _dropped, ...withoutExpect } = validConfig;
    expect(() => checkPlaywrightConfig(withoutExpect, baseline)).toThrow(
      /expect\.timeout is not set/,
    );
  });

  it('rejects retries above the baseline', () => {
    expect(() =>
      checkPlaywrightConfig({ ...validConfig, retries: 3 }, baseline),
    ).toThrow(/retries is 3, above the 2/);
  });

  it('allows retries below the baseline, so it can only improve', () => {
    expect(() =>
      checkPlaywrightConfig({ ...validConfig, retries: 1 }, baseline),
    ).not.toThrow();
  });

  it('rejects workers below the baseline', () => {
    expect(() =>
      checkPlaywrightConfig({ ...validConfig, workers: 1 }, baseline),
    ).toThrow(/workers is 1, below the 4/);
  });

  it('allows workers above the baseline', () => {
    expect(() =>
      checkPlaywrightConfig({ ...validConfig, workers: 8 }, baseline),
    ).not.toThrow();
  });

  it('tolerates an undefined workers (playwright picks its own)', () => {
    const { workers: _dropped, ...withoutWorkers } = validConfig;
    expect(() => checkPlaywrightConfig(withoutWorkers, baseline)).not.toThrow();
  });
});

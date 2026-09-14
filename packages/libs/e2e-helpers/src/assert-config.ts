/**
 * Invariants every widget's playwright config has to keep.
 *
 * This guards against *coping behaviour* rather than against code, which is
 * what actually happened here: instead of fixing a race, `retries` went to 4 in
 * one package and `workers` was pinned to 1 in three others. No lint rule
 * notices that. Each widget calls this from its own jest test, so the config is
 * an input to that package's own test target and a change cannot be cache-
 * replayed as green.
 *
 * A related trap, worth knowing before you trust a green run: `test:e2e` is a
 * cacheable nx target, so re-running CI on an unchanged commit replays the
 * previous result instead of running playwright again. The job goes green in
 * seconds and proves nothing. To actually re-run a suite you have to change one
 * of its inputs, or pass `--skip-nx-cache` locally.
 */

type WebServerLike = {
  url?: string;
  port?: number;
  command?: string;
};

type ConfigLike = {
  retries?: number;
  /** playwright also accepts a percentage string such as '50%' */
  workers?: number | string;
  expect?: { timeout?: number };
  webServer?: WebServerLike | WebServerLike[];
};

type Baseline = {
  /** highest `retries` this package is allowed to use */
  maxRetries: number;
  /** lowest `workers` this package is allowed to drop to */
  minWorkers: number;
};

const assertPlaywrightConfigInvariants = (
  config: ConfigLike,
  baseline: Baseline,
): void => {
  const servers = Array.isArray(config.webServer)
    ? config.webServer
    : [config.webServer].filter(Boolean as unknown as (v: unknown) => boolean);

  // Every server needs a readiness check. Without one, playwright starts the
  // process and moves on: the components bundle can be requested before its
  // server is listening, and every descope-* element then silently fails to
  // upgrade.
  servers.forEach((server, index) => {
    if (!server?.url && server?.port === undefined) {
      throw new Error(
        `playwright config: webServer[${index}] has no url or port, so playwright will not wait for it to be ready. Command: ${
          server?.command ?? '(none)'
        }`,
      );
    }
  });

  // A ceiling for web-first assertions. Without it they run on playwright's 5s
  // default, which is too tight for a loaded CI container.
  if (!config.expect?.timeout) {
    throw new Error(
      'playwright config: expect.timeout is not set, so web-first assertions fall back to the 5s default',
    );
  }

  // A ratchet, not a target: these may improve, never regress. If you are
  // lowering retries or raising workers, update the baseline in the same commit.
  const retries = config.retries ?? 0;
  if (retries > baseline.maxRetries) {
    throw new Error(
      `playwright config: retries is ${retries}, above the ${baseline.maxRetries} this package is allowed. Retries hide flakiness rather than fixing it - fix the race instead, or lower the baseline.`,
    );
  }

  // Only compare when it is a plain count. A percentage ('50%') resolves
  // against the runner's CPU count, so it is not comparable to a fixed number -
  // that case is left to review.
  const { workers } = config;
  if (typeof workers === 'number' && workers < baseline.minWorkers) {
    throw new Error(
      `playwright config: workers is ${workers}, below the ${baseline.minWorkers} this package is allowed. Serialising a suite hides races rather than fixing them.`,
    );
  }
};

export { assertPlaywrightConfigInvariants };
export type { Baseline, ConfigLike };

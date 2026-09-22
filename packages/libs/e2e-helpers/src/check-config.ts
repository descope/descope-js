/**
 * Rules every widget's playwright config has to keep.
 *
 * These guard against papering over a race instead of fixing it - which is what
 * happened here: `retries` went to 4 in one package and `workers` was pinned to
 * 1 in three others, and no lint rule notices that. Each widget calls this from
 * its own jest test, so its config is an input to that package's test target.
 *
 * Worth knowing before trusting a green run: `test:e2e` is a cacheable nx
 * target, so re-running CI on an unchanged commit replays the old result in
 * seconds without running playwright. To really re-run a suite, change one of
 * its inputs or pass `--skip-nx-cache`.
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

type Limits = {
  /** highest `retries` this package may use */
  maxRetries: number;
  /** lowest `workers` this package may drop to */
  minWorkers: number;
};

const checkPlaywrightConfig = (config: ConfigLike, limits: Limits): void => {
  const servers = Array.isArray(config.webServer)
    ? config.webServer
    : [config.webServer].filter(Boolean as unknown as (v: unknown) => boolean);

  // Without a readiness check playwright starts the process and moves on, so
  // the components bundle can be requested before its server is listening and
  // every descope-* element silently fails to upgrade.
  servers.forEach((server, index) => {
    if (!server?.url && server?.port === undefined) {
      throw new Error(
        `playwright config: webServer[${index}] has no url or port, so playwright will not wait for it to be ready. Command: ${
          server?.command ?? '(none)'
        }`,
      );
    }
  });

  // Without this, web-first assertions run on playwright's 5s default, which is
  // too tight for a loaded CI container.
  if (!config.expect?.timeout) {
    throw new Error(
      'playwright config: expect.timeout is not set, so web-first assertions fall back to the 5s default',
    );
  }

  // These may improve, never regress. Lowering retries or raising workers means
  // updating the limits in the same commit.
  const retries = config.retries ?? 0;
  if (retries > limits.maxRetries) {
    throw new Error(
      `playwright config: retries is ${retries}, above the ${limits.maxRetries} this package is allowed. Retries hide flakiness rather than fixing it - fix the race instead, or lower the limit.`,
    );
  }

  // A percentage ('50%') resolves against the runner's CPU count, so it is not
  // comparable to a fixed number - left to review.
  const { workers } = config;
  if (typeof workers === 'number' && workers < limits.minWorkers) {
    throw new Error(
      `playwright config: workers is ${workers}, below the ${limits.minWorkers} this package is allowed. Serialising a suite hides races rather than fixing them.`,
    );
  }
};

export { checkPlaywrightConfig };
export type { Limits, ConfigLike };

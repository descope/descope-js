import { createSingletonMixin } from '@descope/sdk-helpers';
import { Logger } from './types';

const logLevels = ['error', 'warn', 'info', 'debug'] as const;

export type LogLevel = (typeof logLevels)[number];

export const loggerMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class LoggerMixinClass extends superclass {
      #logger: Logger = this.#wrapLogger(console);

      #wrapLogger(logger: Partial<Logger>) {
        return logLevels.reduce((acc, logLevel) => {
          acc[logLevel] = (...args: any[]) => {
            this.onLogEvent(logLevel, args);
            logger[logLevel]?.(...args);
          };

          return acc;
        }, {}) as Logger;
      }

      set logger(logger: Partial<Logger>) {
        this.#logger = this.#wrapLogger(logger);
      }

      get logger(): Logger {
        return this.#logger;
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
      onLogEvent(logLevel: LogLevel, data: any[]) {}
    },
);

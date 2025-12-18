import { createSingletonMixin } from '@descope/sdk-helpers';
import { Logger } from './types';

const logLevels = ['error', 'warn', 'info', 'debug'] as const;

export type LogLevel = (typeof logLevels)[number];

const defaultLogger: Logger = {
  error: console.error.bind(console, '[Descope]'),
  warn: console.warn.bind(console, '[Descope]'),
  info: console.info.bind(console, '[Descope]'),
  debug: console.debug.bind(console, '[Descope]'),
};

export const loggerMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class LoggerMixinClass extends superclass {
      #logger: Logger = this.#wrapLogger(defaultLogger);

      #wrapLogger(logger: Partial<Logger>) {
        return logLevels.reduce((acc, logLevel) => {
          acc[logLevel] = (...args: any[]) => {
            this.onLogEvent(logLevel, args);
            logger[logLevel]?.(...args);
          };

          return acc;
        }, {}) as Logger;
      }

      set logger(logger: Partial<Logger> | undefined) {
        this.#logger = this.#wrapLogger(logger || defaultLogger);
      }

      get logger(): Logger {
        return this.#logger;
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
      onLogEvent(logLevel: LogLevel, data: any[]) {}
    },
);

import { createSingletonMixin } from '../../helpers/mixins';
import { Logger } from './types';

const logLevels = ['error', 'warn', 'info', 'debug'];

// TODO: think how we can prevent from internal events to leak outside, maybe events mixin?
export const INTERNAL_LOG_EVENTS = logLevels.reduce(
  (acc, logLevel) => {
    acc[logLevel] = `logger-${logLevel}`;

    return acc;
  },
  {} as Record<keyof Logger, string>,
);

export const loggerMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class LoggerMixinClass extends superclass {
      #logger: Logger = this.#wrapLogger(console);

      #wrapLogger(logger: Partial<Logger>) {
        return logLevels.reduce((acc, logLevel) => {
          acc[logLevel] = (...args: any[]) => {
            //TODO: internal/external events mixin?
            this.dispatchEvent(new CustomEvent(INTERNAL_LOG_EVENTS[logLevel], { detail: args }));
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
    },
);

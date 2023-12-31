import { createSingletonMixin } from '../../helpers/mixins';
import { Logger } from './types';

const logLevels = ['error', 'warn', 'info', 'debug'];

export const INTERNAL_LOG_EVENTS = logLevels.reduce(
  (acc, logLevel) => {
    acc[logLevel] = Symbol(logLevel);

    return acc;
  },
  {} as Record<keyof Logger, symbol>,
);

export const loggerMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class LoggerMixinClass extends superclass {
      #logger: Logger = console;

      set logger(logger: Partial<Logger>) {
        this.#logger = logLevels.reduce((acc, logLevel) => {
          acc[logLevel] = (...args: any[]) => {
            this.dispatchEvent(INTERNAL_LOG_EVENTS[logLevel]);
            logger[logLevel]?.(...args);
          };

          return acc;
        }, {}) as Logger;
      }

      get logger() {
        return this.#logger;
      }
    },
);

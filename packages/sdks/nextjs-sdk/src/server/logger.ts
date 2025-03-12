/* eslint-disable no-console */
import { LogLevel } from '../types';

// order of levels is important
const levels = ['debug', 'info', 'warn', 'error'];

const logger = {
	debug: console.debug,
	info: console.info,
	log: console.log,
	warn: console.warn,
	error: console.error
};

const noop = () => {};

// override global logger according to the level
export const setLogger = (level: LogLevel = 'info') => {
	Object.keys(logger).forEach((key) => {
		const keyToCompare = key === 'log' ? 'info' : key; // log is an alias for info
		if (levels.indexOf(keyToCompare) < levels.indexOf(level)) {
			logger[key] = noop;
		} else {
			logger[key] = console[key];
		}
	});
};

export { logger };

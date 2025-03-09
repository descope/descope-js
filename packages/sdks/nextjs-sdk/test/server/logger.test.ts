/* eslint-disable no-console */

describe('logger', () => {
	describe('logger object', () => {
		it('should have console attributes by default', async () => {
			const { logger } = await import('../../src/server/logger');

			expect(logger.info).toEqual(console.info);
			expect(logger.debug).toEqual(console.debug);
			expect(logger.warn).toEqual(console.warn);
			expect(logger.error).toEqual(console.error);
			expect(logger.log).toEqual(console.log);
		});
	});

	describe('setLogger', () => {
		it('should create a new sdk if one does not exist', async () => {
			const debugSpy = jest
				.spyOn(console, 'debug')
				.mockImplementation(() => {});
			const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
			const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
			const errorSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			const { logger, setLogger } = await import('../../src/server/logger');

			// set warn and ensure that only warn and error are not noop
			setLogger('warn');

			logger.debug('this is a debug message');
			logger.info('this is an info message');
			logger.log('this is a log message');
			logger.warn('this is a warn message');
			logger.error('this is an error message');

			expect(debugSpy).not.toHaveBeenCalled();
			expect(infoSpy).not.toHaveBeenCalled();
			expect(logSpy).not.toHaveBeenCalled();
			expect(warnSpy).toHaveBeenCalledWith('this is a warn message');
			expect(errorSpy).toHaveBeenCalledWith('this is an error message');

			// set debug and ensure that all are not noop
			setLogger('debug');

			logger.debug('this is a debug message 2');
			logger.info('this is an info message 2');
			logger.log('this is a log message 2');
			logger.warn('this is a warn message 2');
			logger.error('this is an error message 2');

			expect(debugSpy).toHaveBeenCalledWith('this is a debug message 2');
			expect(infoSpy).toHaveBeenCalledWith('this is an info message 2');
			expect(logSpy).toHaveBeenCalledWith('this is a log message 2');
			expect(warnSpy).toHaveBeenCalledWith('this is a warn message 2');
			expect(errorSpy).toHaveBeenCalledWith('this is an error message 2');
		});
	});
});

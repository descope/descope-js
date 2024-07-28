import { headers } from 'next/headers';
import { session, getSession } from '../../src/server/session';

jest.mock('next/headers', () => ({
	headers: jest.fn()
}));

describe('session utilities', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('session', () => {
		it('should extract and return session information if present', () => {
			(headers as jest.Mock).mockImplementation(
				() =>
					new Map([
						[
							'x-descope-session',
							Buffer.from(JSON.stringify({ user: 'testUser' })).toString(
								'base64'
							)
						]
					])
			);
			const result = session();
			expect(result).toEqual({ user: 'testUser' });
		});

		it('should return undefined if session header is missing', () => {
			(headers as jest.Mock).mockImplementation(() => new Map());
			jest.mock('next/headers', () => ({
				headers: jest.fn().mockImplementation(() => new Map())
			}));
			const result = session();
			expect(result).toBeUndefined();
		});
	});

	describe('getSession', () => {
		it('should extract and return session information if present in request headers', () => {
			const mockReq = {
				headers: {
					'x-descope-session': Buffer.from(
						JSON.stringify({ user: 'testUser' })
					).toString('base64')
				}
			};
			const result = getSession(mockReq as any);
			expect(result).toEqual({ user: 'testUser' });
		});

		it('should return undefined if session header is missing in request', () => {
			const mockReq = { headers: {} };
			const result = getSession(mockReq as any);
			expect(result).toBeUndefined();
		});

		it('should return undefined if session header is malformed', () => {
			const mockReq = {
				headers: {
					'x-descope-session': 'malformedBase64'
				}
			};
			const result = getSession(mockReq as any);
			expect(result).toBeUndefined();
		});
	});
});

import { headers, cookies } from 'next/headers';
import { session, getSession } from '../../src/server/session';

const mockValidateJwt = jest.fn();
jest.mock('@descope/node-sdk', () => {
	const res = jest.fn(() => ({
		validateJwt: mockValidateJwt
	}));
	res.SessionTokenCookieName = 'DS';
	return res;
});

jest.mock('next/headers', () => ({
	headers: jest.fn(),
	cookies: jest.fn()
}));

describe('session utilities', () => {
	afterEach(() => {
		jest.resetAllMocks();
		mockValidateJwt?.mockReset();
	});

	describe('session', () => {
		it('should return session if session is in the cookie', async () => {
			// Mock validateJwt to simulate an authenticated user
			const authInfo = {
				jwt: 'validJwt',
				token: { iss: 'project-1', sub: 'user-123' }
			};
			mockValidateJwt.mockImplementation(() => authInfo);
			(cookies as jest.Mock).mockImplementation(
				() =>
					new Map([
						[
							'DS',
							{
								value: 'validJwt'
							}
						]
					])
			);
			(headers as jest.Mock).mockImplementation(() => new Map());
			jest.mock('next/headers', () => ({
				headers: jest.fn().mockImplementation(() => new Map())
			}));
			const result = await session({
				projectId: 'test',
				baseUrl: 'http://example.com'
			});
			expect(result).toEqual(authInfo);
		});

		it('should return undefined if session in cookie is not valid', async () => {
			// Mock validateJwt to simulate invalid JWT
			mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
			(cookies as jest.Mock).mockImplementation(
				() =>
					new Map([
						[
							'DS',
							{
								value: 'invalidJwt'
							}
						]
					])
			);
			(headers as jest.Mock).mockImplementation(() => new Map());
			jest.mock('next/headers', () => ({
				headers: jest.fn().mockImplementation(() => new Map())
			}));
			const result = await session({
				projectId: 'test',
				baseUrl: 'http://example.com'
			});
			expect(result).toBeUndefined();
		});

		it('should extract and return session information if present', async () => {
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
			const result = await session();
			expect(result).toEqual({ user: 'testUser' });
		});

		it('should return undefined if session header is missing', async () => {
			(headers as jest.Mock).mockImplementation(() => new Map());
			jest.mock('next/headers', () => ({
				headers: jest.fn().mockImplementation(() => new Map())
			}));
			const result = await session();
			expect(result).toBeUndefined();
		});
	});

	describe('getSession', () => {
		it('should return session if session is in the cookie', async () => {
			const mockReq = { headers: {} };

			// Mock validateJwt to simulate an authenticated user
			const authInfo = {
				jwt: 'validJwt',
				token: { iss: 'project-1', sub: 'user-123' }
			};
			mockValidateJwt.mockImplementation(() => authInfo);
			(cookies as jest.Mock).mockImplementation(
				() =>
					new Map([
						[
							'DS',
							{
								value: 'validJwt'
							}
						]
					])
			);
			(headers as jest.Mock).mockImplementation(() => new Map());
			jest.mock('next/headers', () => ({
				headers: jest.fn().mockImplementation(() => new Map())
			}));
			const result = await getSession(mockReq as any, {
				projectId: 'test',
				baseUrl: 'http://example.com'
			});
			expect(result).toEqual(authInfo);
		});

		it('should return undefined if session in cookie is not valid', async () => {
			const mockReq = { headers: {} };
			// Mock validateJwt to simulate invalid JWT
			mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
			(cookies as jest.Mock).mockImplementation(
				() =>
					new Map([
						[
							'DS',
							{
								value: 'invalidJwt'
							}
						]
					])
			);
			(headers as jest.Mock).mockImplementation(() => new Map());
			jest.mock('next/headers', () => ({
				headers: jest.fn().mockImplementation(() => new Map())
			}));
			const result = await getSession(mockReq as any, {
				projectId: 'test',
				baseUrl: 'http://example.com'
			});
			expect(result).toBeUndefined();
		});

		it('should extract and return session information if present in request headers', async () => {
			const mockReq = {
				headers: {
					'x-descope-session': Buffer.from(
						JSON.stringify({ user: 'testUser' })
					).toString('base64')
				}
			};
			const result = await getSession(mockReq as any);
			expect(result).toEqual({ user: 'testUser' });
		});

		it('should return undefined if session header is missing in request', async () => {
			const mockReq = { headers: {} };
			const result = await getSession(mockReq as any);
			expect(result).toBeUndefined();
		});

		it('should return undefined if session header is malformed', async () => {
			const mockReq = {
				headers: {
					'x-descope-session': 'malformedBase64'
				}
			};
			const result = await getSession(mockReq as any);
			expect(result).toBeUndefined();
		});
	});
});

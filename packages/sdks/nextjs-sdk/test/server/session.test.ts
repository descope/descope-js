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

		it('should validate session information from the authorization header', async () => {
			const authInfo = {
				jwt: 'authorizationJwt',
				token: { iss: 'project-1', sub: 'user-123' }
			};
			mockValidateJwt.mockResolvedValue(authInfo);
			(headers as jest.Mock).mockImplementation(
				() => new Map([['Authorization', 'Bearer authorizationJwt']])
			);
			(cookies as jest.Mock).mockImplementation(() => new Map());
			const result = await session({ projectId: 'test' });
			expect(mockValidateJwt).toHaveBeenCalledWith('authorizationJwt');
			expect(result).toEqual(authInfo);
		});

		it('should ignore the legacy session header', async () => {
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
			(cookies as jest.Mock).mockImplementation(() => new Map());

			const result = await session({ projectId: 'test' });

			expect(mockValidateJwt).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it('should fall back to the session cookie when authorization validation fails', async () => {
			const authInfo = {
				jwt: 'cookieJwt',
				token: { iss: 'project-1', sub: 'user-123' }
			};
			mockValidateJwt
				.mockRejectedValueOnce(new Error('Invalid JWT'))
				.mockResolvedValueOnce(authInfo);
			(headers as jest.Mock).mockImplementation(
				() => new Map([['Authorization', 'Bearer invalidAuthorizationJwt']])
			);
			(cookies as jest.Mock).mockImplementation(
				() => new Map([['DS', { value: 'cookieJwt' }]])
			);

			const result = await session({ projectId: 'test' });

			expect(mockValidateJwt).toHaveBeenNthCalledWith(
				1,
				'invalidAuthorizationJwt'
			);
			expect(mockValidateJwt).toHaveBeenNthCalledWith(2, 'cookieJwt');
			expect(result).toEqual(authInfo);
		});

		it('should return undefined if session header is missing', async () => {
			(headers as jest.Mock).mockImplementation(() => new Map());
			(cookies as jest.Mock).mockImplementation(() => new Map());
			const result = await session();
			expect(result).toBeUndefined();
		});
	});

	describe('getSession', () => {
		it('should return session if session is in the request cookie', async () => {
			const mockReq = { headers: {}, cookies: { DS: 'validJwt' } };

			// Mock validateJwt to simulate an authenticated user
			const authInfo = {
				jwt: 'validJwt',
				token: { iss: 'project-1', sub: 'user-123' }
			};
			mockValidateJwt.mockImplementation(() => authInfo);
			const result = await getSession(mockReq as any, {
				projectId: 'test',
				baseUrl: 'http://example.com'
			});
			expect(mockValidateJwt).toHaveBeenCalledWith('validJwt');
			expect(result).toEqual(authInfo);
		});

		it('should read the request cookie even when next/headers is unavailable (Pages Router)', async () => {
			const authInfo = {
				jwt: 'cookieJwt',
				token: { iss: 'project-1', sub: 'user-123' }
			};
			mockValidateJwt.mockResolvedValue(authInfo);
			(cookies as jest.Mock).mockImplementation(() => {
				throw new Error('`cookies` was called outside a request scope');
			});
			const mockReq = { headers: {}, cookies: { DS: 'cookieJwt' } };
			const result = await getSession(mockReq as any, { projectId: 'test' });
			expect(mockValidateJwt).toHaveBeenCalledWith('cookieJwt');
			expect(result).toEqual(authInfo);
		});

		it('should support a custom session cookie name', async () => {
			const authInfo = {
				jwt: 'customJwt',
				token: { iss: 'project-1', sub: 'user-123' }
			};
			mockValidateJwt.mockResolvedValue(authInfo);
			const mockReq = { headers: {}, cookies: { 'my-session': 'customJwt' } };
			const result = await getSession(mockReq as any, {
				projectId: 'test',
				sessionCookieName: 'my-session'
			});
			expect(mockValidateJwt).toHaveBeenCalledWith('customJwt');
			expect(result).toEqual(authInfo);
		});

		it('should return undefined if session in cookie is not valid', async () => {
			const mockReq = { headers: {}, cookies: { DS: 'invalidJwt' } };
			// Mock validateJwt to simulate invalid JWT
			mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
			const result = await getSession(mockReq as any, {
				projectId: 'test',
				baseUrl: 'http://example.com'
			});
			expect(result).toBeUndefined();
		});

		it('should validate session information from the authorization header', async () => {
			const authInfo = {
				jwt: 'authorizationJwt',
				token: { iss: 'project-1', sub: 'user-123' }
			};
			mockValidateJwt.mockResolvedValue(authInfo);
			const mockReq = {
				headers: {
					authorization: 'Bearer authorizationJwt'
				}
			};
			const result = await getSession(mockReq as any, { projectId: 'test' });
			expect(mockValidateJwt).toHaveBeenCalledWith('authorizationJwt');
			expect(result).toEqual(authInfo);
		});

		it('should ignore the legacy session header', async () => {
			const mockReq = {
				headers: {
					'x-descope-session': Buffer.from(
						JSON.stringify({ user: 'testUser' })
					).toString('base64')
				}
			};
			(cookies as jest.Mock).mockImplementation(() => new Map());

			const result = await getSession(mockReq as any, { projectId: 'test' });

			expect(mockValidateJwt).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it('should return undefined if session header is missing in request', async () => {
			const mockReq = { headers: {} };
			const result = await getSession(mockReq as any);
			expect(result).toBeUndefined();
		});

		it('should ignore a malformed legacy session header', async () => {
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

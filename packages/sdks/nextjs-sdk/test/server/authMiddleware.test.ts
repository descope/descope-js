import { NextRequest, NextResponse } from 'next/server';
import authMiddleware from '../../src/server/authMiddleware';
import { DEFAULT_PUBLIC_ROUTES } from '../../src/server/constants';

const mockValidateJwt = jest.fn();
jest.mock('@descope/node-sdk', () => {
	const res = jest.fn(() => ({
		validateJwt: mockValidateJwt
	}));
	(res as any).SessionTokenCookieName = 'DS';
	return res;
});

jest.mock('next/server', () => ({
	NextResponse: {
		redirect: jest.fn(),
		next: jest.fn()
	}
}));

// Utility function to create a mock NextRequest
const createMockNextRequest = (
	options: {
		headers?: Record<string, string>;
		cookies?: Record<string, string>;
		pathname?: string;
	} = {}
) =>
	({
		headers: {
			get: (name: string) => options.headers?.[name]
		},
		cookies: {
			get: (name: string) =>
				options.cookies?.[name] ? { value: options.cookies[name] } : undefined
		},
		nextUrl: {
			pathname: options.pathname || '/',
			clone: jest.fn(() => ({ pathname: options.pathname || '/' }))
		}
	}) as unknown as NextRequest;

describe('authMiddleware', () => {
	beforeEach(() => {
		// Set process.env.DESCOPE_PROJECT_ID to avoid errors
		process.env.DESCOPE_PROJECT_ID = 'project1';
		(NextResponse.redirect as jest.Mock).mockImplementation((url) => url);
		(NextResponse.next as jest.Mock).mockImplementation(() => ({
			headers: { set: jest.fn() },
			request: jest.fn()
		}));
	});

	afterEach(() => {
		jest.resetAllMocks();
		(NextResponse.redirect as jest.Mock).mockReset();
		(NextResponse.next as jest.Mock).mockReset();
		mockValidateJwt?.mockReset();
	});

	it('redirects unauthenticated users for non-public routes', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
		const middleware = authMiddleware();
		const mockReq = createMockNextRequest({ pathname: '/private' });

		const response = await middleware(mockReq);
		expect(NextResponse.redirect).toHaveBeenCalledWith(expect.anything());
		expect(response).toEqual({
			pathname: DEFAULT_PUBLIC_ROUTES.signIn
		});
	});

	it('allows unauthenticated users for public routes', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
		const middleware = authMiddleware({
			publicRoutes: ['/sign-in', '/sign-up']
		});
		const mockReq = createMockNextRequest({ pathname: '/sign-in' });

		await middleware(mockReq);
		// Expect the middleware not to redirect
		expect(NextResponse.redirect).not.toHaveBeenCalled();
	});

	it('redirects unauthenticated users for private routes', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
		const middleware = authMiddleware({
			privateRoutes: ['/private']
		});
		const mockReq = createMockNextRequest({ pathname: '/private' });

		const response = await middleware(mockReq);
		expect(NextResponse.redirect).toHaveBeenCalledWith(expect.anything());
		expect(response).toEqual({
			pathname: DEFAULT_PUBLIC_ROUTES.signIn
		});
	});

	it('allows authenticated users for private routes and adds proper headers', async () => {
		// Mock validateJwt to simulate an authenticated user
		const authInfo = {
			jwt: 'validJwt',
			token: { iss: 'project-1', sub: 'user-123' }
		};
		mockValidateJwt.mockImplementation(() => authInfo);

		const middleware = authMiddleware({
			privateRoutes: ['/private']
		});
		const mockReq = createMockNextRequest({
			pathname: '/private',
			headers: { Authorization: 'Bearer validJwt' }
		});

		await middleware(mockReq);
		// Expect no redirect and check if response contains session headers
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(NextResponse.next).toHaveBeenCalled();

		const headersArg = (NextResponse.next as any as jest.Mock).mock.lastCall[0]
			.request.headers;
		expect(headersArg.get('x-descope-session')).toEqual(
			Buffer.from(JSON.stringify(authInfo)).toString('base64')
		);
	});

	it('allows unauthenticated users for public routes when both public and private routes are defined', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
		const middleware = authMiddleware({
			publicRoutes: ['/sign-in'],
			privateRoutes: ['/private']
		});
		const mockReq = createMockNextRequest({ pathname: '/sign-in' });

		await middleware(mockReq);
		expect(NextResponse.redirect).not.toHaveBeenCalled();
	});

	it('redirects unauthenticated users for private routes when both public and private routes are defined', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
		const middleware = authMiddleware({
			publicRoutes: ['/sign-in'],
			privateRoutes: ['/private']
		});
		const mockReq = createMockNextRequest({ pathname: '/other-route' });

		const response = await middleware(mockReq);
		expect(NextResponse.redirect).toHaveBeenCalledWith(expect.anything());
		expect(response).toEqual({
			pathname: DEFAULT_PUBLIC_ROUTES.signIn
		});
	});

	it('allows authenticated users for non-public routes and adds proper headers', async () => {
		// Mock validateJwt to simulate an authenticated user
		const authInfo = {
			jwt: 'validJwt',
			token: { iss: 'project-1', sub: 'user-123' }
		};
		mockValidateJwt.mockImplementation(() => authInfo);

		const middleware = authMiddleware();
		const mockReq = createMockNextRequest({
			pathname: '/private',
			headers: { Authorization: 'Bearer validJwt' }
		});

		await middleware(mockReq);
		// Expect no redirect and check if response contains session headers
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(NextResponse.next).toHaveBeenCalled();

		const headersArg = (NextResponse.next as any as jest.Mock).mock.lastCall[0]
			.request.headers;
		expect(headersArg.get('x-descope-session')).toEqual(
			Buffer.from(JSON.stringify(authInfo)).toString('base64')
		);
	});

	it('redirects unauthenticated users for private routes matching wildcard patterns', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));

		const middleware = authMiddleware({
			privateRoutes: ['/private/*']
		});

		// Mock request to a route matching the wildcard pattern
		const mockReq = createMockNextRequest({ pathname: '/private/dashboard' });

		const response = await middleware(mockReq);

		// Expect a redirect since the user is unauthenticated
		expect(NextResponse.redirect).toHaveBeenCalledWith(expect.anything());
		expect(response).toEqual({
			pathname: DEFAULT_PUBLIC_ROUTES.signIn
		});
	});

	it('allows authenticated users for private routes matching wildcard patterns', async () => {
		const authInfo = {
			jwt: 'validJwt',
			token: { iss: 'project-1', sub: 'user-123' }
		};
		mockValidateJwt.mockImplementation(() => authInfo);

		const middleware = authMiddleware({
			privateRoutes: ['/private/*']
		});

		const mockReq = createMockNextRequest({
			pathname: '/private/settings',
			headers: { Authorization: 'Bearer validJwt' }
		});

		await middleware(mockReq);

		// Expect no redirect and that the session header is set
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(NextResponse.next).toHaveBeenCalled();

		const headersArg = (NextResponse.next as any as jest.Mock).mock.lastCall[0]
			.request.headers;
		expect(headersArg.get('x-descope-session')).toEqual(
			Buffer.from(JSON.stringify(authInfo)).toString('base64')
		);
	});

	it('allows unauthenticated users for public routes matching wildcard patterns', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));

		const middleware = authMiddleware({
			publicRoutes: ['/public/*']
		});

		// Mock request to a route matching the wildcard pattern
		const mockReq = createMockNextRequest({ pathname: '/public/info' });

		await middleware(mockReq);

		// Expect no redirect since it's a public route
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(NextResponse.next).toHaveBeenCalled();
	});

	it('blocks unauthenticated users and redirects to custom URL', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
		const customRedirectUrl = '/custom-sign-in';
		const middleware = authMiddleware({ redirectUrl: customRedirectUrl });
		const mockReq = createMockNextRequest({ pathname: '/private' });

		await middleware(mockReq);
		expect(NextResponse.redirect).toHaveBeenCalledWith({
			pathname: customRedirectUrl
		});
	});

	it('support and redirect url with search params', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));
		const customRedirectUrl = '/custom-sign-in?redirect=/another-path';
		const middleware = authMiddleware({ redirectUrl: customRedirectUrl });
		const mockReq = createMockNextRequest({ pathname: '/private' });

		await middleware(mockReq);
		expect(NextResponse.redirect).toHaveBeenCalledWith({
			pathname: '/custom-sign-in',
			search: `redirect=${encodeURIComponent('/another-path')}`
		});
	});

	it('uses custom sessionCookieName when provided', async () => {
		const authInfo = {
			jwt: 'validJwt',
			token: { iss: 'project-1', sub: 'user-123' }
		};
		mockValidateJwt.mockImplementation(() => authInfo);

		const customCookieName = 'CUSTOM_SESSION';
		const middleware = authMiddleware({
			sessionCookieName: customCookieName
		});

		const mockReq = createMockNextRequest({
			pathname: '/private',
			cookies: { [customCookieName]: 'validJwt' }
		});

		await middleware(mockReq);

		// Expect no redirect and that the session header is set
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(NextResponse.next).toHaveBeenCalled();

		const headersArg = (NextResponse.next as any as jest.Mock).mock.lastCall[0]
			.request.headers;
		expect(headersArg.get('x-descope-session')).toEqual(
			Buffer.from(JSON.stringify(authInfo)).toString('base64')
		);
	});

	describe('Refresh token validation', () => {
		it('validates refresh token when session JWT fails', async () => {
			// First call fails (session JWT), second call succeeds (refresh token)
			mockValidateJwt
				.mockRejectedValueOnce(new Error('Session JWT expired'))
				.mockResolvedValueOnce({
					jwt: 'validRefreshJwt',
					token: { iss: 'project-1', sub: 'user-123' }
				});

			const middleware = authMiddleware();
			const mockReq = createMockNextRequest({
				pathname: '/private',
				cookies: { DS: 'expiredSessionJwt', DSR: 'validRefreshJwt' }
			});

			await middleware(mockReq);

			// Expect validateJwt to be called twice
			expect(mockValidateJwt).toHaveBeenCalledTimes(2);
			expect(mockValidateJwt).toHaveBeenNthCalledWith(1, 'expiredSessionJwt');
			expect(mockValidateJwt).toHaveBeenNthCalledWith(2, 'validRefreshJwt');

			// Expect no redirect since refresh token is valid
			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(NextResponse.next).toHaveBeenCalled();
		});

		it('redirects when both session JWT and refresh token fail', async () => {
			// Both calls fail
			mockValidateJwt
				.mockRejectedValueOnce(new Error('Session JWT expired'))
				.mockRejectedValueOnce(new Error('Refresh token expired'));

			const middleware = authMiddleware();
			const mockReq = createMockNextRequest({
				pathname: '/private',
				cookies: { DS: 'expiredSessionJwt', DSR: 'expiredRefreshJwt' }
			});

			const response = await middleware(mockReq);

			// Expect validateJwt to be called twice
			expect(mockValidateJwt).toHaveBeenCalledTimes(2);

			// Expect redirect since both tokens are invalid
			expect(NextResponse.redirect).toHaveBeenCalledWith(expect.anything());
			expect(response).toEqual({
				pathname: DEFAULT_PUBLIC_ROUTES.signIn
			});
		});

		it('redirects when session JWT fails and no refresh token exists', async () => {
			mockValidateJwt.mockRejectedValueOnce(new Error('Session JWT expired'));

			const middleware = authMiddleware();
			const mockReq = createMockNextRequest({
				pathname: '/private',
				cookies: { DS: 'expiredSessionJwt' } // No refresh token
			});

			const response = await middleware(mockReq);

			// Expect validateJwt to be called only once (session JWT)
			expect(mockValidateJwt).toHaveBeenCalledTimes(1);

			// Expect redirect since no refresh token is available
			expect(NextResponse.redirect).toHaveBeenCalledWith(expect.anything());
			expect(response).toEqual({
				pathname: DEFAULT_PUBLIC_ROUTES.signIn
			});
		});

		it('uses custom refreshTokenCookieName when provided', async () => {
			// First call fails (session JWT), second call succeeds (refresh token)
			mockValidateJwt
				.mockRejectedValueOnce(new Error('Session JWT expired'))
				.mockResolvedValueOnce({
					jwt: 'validRefreshJwt',
					token: { iss: 'project-1', sub: 'user-123' }
				});

			const customRefreshCookieName = 'CUSTOM_REFRESH';
			const middleware = authMiddleware({
				refreshTokenCookieName: customRefreshCookieName
			});

			const mockReq = createMockNextRequest({
				pathname: '/private',
				cookies: {
					DS: 'expiredSessionJwt',
					[customRefreshCookieName]: 'validRefreshJwt'
				}
			});

			await middleware(mockReq);

			// Expect validateJwt to be called twice with correct tokens
			expect(mockValidateJwt).toHaveBeenCalledTimes(2);
			expect(mockValidateJwt).toHaveBeenNthCalledWith(2, 'validRefreshJwt');

			// Expect no redirect since refresh token is valid
			expect(NextResponse.redirect).not.toHaveBeenCalled();
		});

		it('does not add refresh token validation result to session headers', async () => {
			// First call fails (session JWT), second call succeeds (refresh token)
			const refreshAuthInfo = {
				jwt: 'validRefreshJwt',
				token: { iss: 'project-1', sub: 'user-123', exp: 1234567890 }
			};
			mockValidateJwt
				.mockRejectedValueOnce(new Error('Session JWT expired'))
				.mockResolvedValueOnce(refreshAuthInfo);

			const middleware = authMiddleware();
			const mockReq = createMockNextRequest({
				pathname: '/private',
				cookies: { DS: 'expiredSessionJwt', DSR: 'validRefreshJwt' }
			});

			await middleware(mockReq);

			expect(NextResponse.next).toHaveBeenCalled();

			// Verify that session headers are NOT set (because we don't add refresh token validation to headers)
			const headersArg = (NextResponse.next as any as jest.Mock).mock
				.lastCall[0].request.headers;
			expect(headersArg.get('x-descope-session')).toBeUndefined();
		});

		it('allows access to public routes even when both tokens fail', async () => {
			// Both calls fail
			mockValidateJwt
				.mockRejectedValueOnce(new Error('Session JWT expired'))
				.mockRejectedValueOnce(new Error('Refresh token expired'));

			const middleware = authMiddleware({
				publicRoutes: ['/public']
			});
			const mockReq = createMockNextRequest({
				pathname: '/public',
				cookies: { DS: 'expiredSessionJwt', DSR: 'expiredRefreshJwt' }
			});

			await middleware(mockReq);

			// Expect no redirect for public routes
			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(NextResponse.next).toHaveBeenCalled();
		});
	});
});

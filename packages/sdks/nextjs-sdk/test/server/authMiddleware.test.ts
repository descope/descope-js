import { NextRequest, NextResponse } from 'next/server';
import authMiddleware from '../../src/server/authMiddleware';
import { DEFAULT_PUBLIC_ROUTES } from '../../src/server/constants';

const mockValidateJwt = jest.fn();
jest.mock('@descope/node-sdk', () =>
	jest.fn(() => ({
		validateJwt: mockValidateJwt
	}))
);

jest.mock('next/server', () => ({
	NextResponse: {
		redirect: jest.fn(),
		next: jest.fn()
	}
}));

// Mock another middleware for testing chaining
const mockMiddleware = jest.fn(async (req: NextRequest) => {
	const headers = new Headers(req.headers);
	headers.set('X-Test-Header', 'test-value');
	return NextResponse.next({ request: { headers } });
});

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
			get: (name: string) => ({ value: options.cookies?.[name] })
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
});

describe('authMiddleware Chaining', () => {
	beforeEach(() => {
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
		mockMiddleware?.mockReset();
	});

	it('chains middleware correctly for public routes', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));

		const middleware = async (req: NextRequest) => {
			const authResponse = await authMiddleware({ publicRoutes: ['/public'] })(req);
			if (authResponse) return authResponse;
			return mockMiddleware(req);
		};

		const mockReq = createMockNextRequest({ pathname: '/public' });
		const response = await middleware(mockReq);

		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(mockMiddleware).toHaveBeenCalled();
		expect(response).toEqual(expect.any(Object));
	});

	it('blocks unauthenticated users on private routes in a chained middleware setup', async () => {
		mockValidateJwt.mockRejectedValue(new Error('Invalid JWT'));

		const middleware = async (req: NextRequest) => {
			const authResponse = await authMiddleware({ privateRoutes: ['/private'] })(req);
			if (authResponse) return authResponse;
			return mockMiddleware(req);
		};

		const mockReq = createMockNextRequest({ pathname: '/private' });
		const response = await middleware(mockReq);

		expect(NextResponse.redirect).toHaveBeenCalled();
		expect(mockMiddleware).not.toHaveBeenCalled();
		expect(response).toEqual({ pathname: DEFAULT_PUBLIC_ROUTES.signIn });
	});

	it('allows authenticated users through both middlewares', async () => {
		const authInfo = {
			jwt: 'validJwt',
			token: { iss: 'project-1', sub: 'user-123' }
		};
		mockValidateJwt.mockImplementation(() => authInfo);
	
		const middleware = async (req: NextRequest) => {
			console.debug('Middleware chaining - authMiddleware is executing...');
			const authResponse = await authMiddleware()(req, async () => {
				console.debug('Middleware chaining - mockMiddleware is being called');
				return mockMiddleware(req);
			});
			if (authResponse) return authResponse;
			console.debug('Middleware chaining - mockMiddleware did not return a response');
			return mockMiddleware(req);
		};
	
		const mockReq = createMockNextRequest({
			pathname: '/private',
			headers: { Authorization: 'Bearer validJwt' }
		});
	
		await middleware(mockReq);
	
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(mockMiddleware).toHaveBeenCalled();
	});

	it('preserves request headers when chaining middleware', async () => {
		const authInfo = {
			jwt: 'validJwt',
			token: { iss: 'project-1', sub: 'user-123' }
		};
		mockValidateJwt.mockImplementation(() => authInfo);
	
		const middleware = async (req: NextRequest) => {
			const authResponse = await authMiddleware()(req, mockMiddleware);
			if (authResponse) return authResponse;
			return mockMiddleware(req);
		};
	
		const mockReq = createMockNextRequest({
			pathname: '/private',
			headers: { Authorization: 'Bearer validJwt' }
		});
	
		await middleware(mockReq);
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(mockMiddleware).toHaveBeenCalled();
	
		// Verify headers are properly forwarded
		const headersArg = (NextResponse.next as any as jest.Mock).mock.lastCall[0]
			.request.headers;
		expect(headersArg.get('x-descope-session')).toEqual(
			Buffer.from(JSON.stringify(authInfo)).toString('base64')
		);
		expect(headersArg.get('X-Test-Header')).toEqual('test-value');
	});
});

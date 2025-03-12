/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import descopeSdk from '@descope/node-sdk';
import type { AuthenticationInfo } from '@descope/node-sdk';
import { DEFAULT_PUBLIC_ROUTES, DESCOPE_SESSION_HEADER } from './constants';
import { getGlobalSdk } from './sdk';
import { mergeSearchParams } from './utils';

type MiddlewareOptions = {
	// The Descope project ID to use for authentication
	// Defaults to process.env.DESCOPE_PROJECT_ID
	projectId?: string;

	// The base URL to use for authentication
	// Defaults to process.env.DESCOPE_BASE_URL
	baseUrl?: string;

	// The URL to redirect to if the user is not authenticated
	// Defaults to process.env.SIGN_IN_ROUTE or '/sign-in' if not provided
	// NOTE: In case it contains query parameters that exist in the original URL, they will override the original query parameters. e.g. if the original URL is /page?param1=1&param2=2 and the redirect URL is /sign-in?param1=3, the final redirect URL will be /sign-in?param1=3&param2=2
	redirectUrl?: string;

	// An array of public routes that do not require authentication
	// In addition to the default public routes:
	// - process.env.SIGN_IN_ROUTE or /sign-in if not provided
	// - process.env.SIGN_UP_ROUTE or /sign-up if not provided
	publicRoutes?: string[];

	// An array of private routes that require authentication
	// If privateRoutes is defined, routes not listed in this array will default to public routes
	privateRoutes?: string[];
};

export type MiddlewareFunction = (
	req: NextRequest
  ) => Promise<NextResponse> | NextResponse;
  
  const getSessionJwt = (req: NextRequest): string | undefined => {
	let jwt = req.headers?.get('Authorization')?.split(' ')[1];
	if (jwt) {
	  return jwt;
	}
  
	jwt = req.cookies?.get(descopeSdk.SessionTokenCookieName)?.value;
	if (jwt) {
	  return jwt;
	}
	return undefined;
  };

const matchWildcardRoute = (route: string, path: string) => {
	let regexPattern = route.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

	// Convert wildcard (*) to match path segments only
	regexPattern = regexPattern.replace(/\*/g, '[^/]*');
	const regex = new RegExp(`^${regexPattern}$`);

	return regex.test(path);
};

const isPublicRoute = (req: NextRequest, options: MiddlewareOptions) => {
	// Ensure publicRoutes and privateRoutes are arrays, defaulting to empty arrays if not defined
	const { publicRoutes = [], privateRoutes = [] } = options;
	const { pathname } = req.nextUrl;

	const isDefaultPublicRoute = Object.values(DEFAULT_PUBLIC_ROUTES).includes(
		pathname
	);

	if (publicRoutes.length > 0) {
		if (privateRoutes.length > 0) {
			console.warn(
				'Both publicRoutes and privateRoutes are defined. Ignoring privateRoutes.'
			);
		}
		return (
			isDefaultPublicRoute ||
			publicRoutes.some((route) => matchWildcardRoute(route, pathname))
		);
	}

	if (privateRoutes.length > 0) {
		return (
			isDefaultPublicRoute ||
			!privateRoutes.some((route) => matchWildcardRoute(route, pathname))
		);
	}

	// If no routes are provided, all routes are private
	return isDefaultPublicRoute;
};

const addSessionToHeadersIfExists = (
	headers: Headers,
	session: AuthenticationInfo | undefined
): Headers => {
	if (session) {
		const requestHeaders = new Headers(headers);
		requestHeaders.set(
			DESCOPE_SESSION_HEADER,
			Buffer.from(JSON.stringify(session)).toString('base64')
		);
		return requestHeaders;
	}
	return headers;
};

export const chainMiddleware = (
	...middlewares: ((req: NextRequest, next?: MiddlewareFunction) => Promise<NextResponse> | NextResponse)[]
  ) => {
	return async (req: NextRequest) => {
	  const runner = async (index: number, request: NextRequest): Promise<NextResponse> => {
		// If we've run through all middlewares, just return next()
		if (index >= middlewares.length) {
		  return NextResponse.next();
		}
  
		// Get the current middleware
		const middleware = middlewares[index];
  
		// The next function for this middleware calls the next middleware in the chain
		const nextMiddleware = (nextReq: NextRequest) => runner(index + 1, nextReq);
  
		// Run the current middleware with the request and the next middleware
		return middleware(request, nextMiddleware);
	  };
  
	  return runner(0, req);
	};
  };

// returns a Middleware that checks if the user is authenticated
// if the user is not authenticated, it redirects to the redirectUrl
// if the user is authenticated, it adds the session to the headers
const createAuthMiddleware =
  (options: MiddlewareOptions = {}) =>
  async (req: NextRequest, next?: MiddlewareFunction) => {
		console.debug('Auth middleware starts');

		const jwt = getSessionJwt(req);

		// Check if the user is authenticated
		let session: AuthenticationInfo | undefined;
		try {
			session = await getGlobalSdk({
				projectId: options.projectId,
				baseUrl: options.baseUrl
			}).validateJwt(jwt);
		} catch (err) {
			console.debug('Auth middleware, Failed to validate JWT', err);
			if (!isPublicRoute(req, options)) {
				const redirectUrl = options.redirectUrl || DEFAULT_PUBLIC_ROUTES.signIn;
				const url = req.nextUrl.clone();
				// Create a URL object for redirectUrl. 'http://example.com' is just a placeholder.
				const parsedRedirectUrl = new URL(redirectUrl, 'http://example.com');
				url.pathname = parsedRedirectUrl.pathname;

				const searchParams = mergeSearchParams(
					url.search,
					parsedRedirectUrl.search
				);
				if (searchParams) {
					url.search = searchParams;
				}
				console.debug(`Auth middleware, Redirecting to ${redirectUrl}`);
				return NextResponse.redirect(url);
			}
		}

		console.debug('Auth middleware finishes');

		// Add the session to the request, if it exists
		const headers = addSessionToHeadersIfExists(req.headers, session);
		const reqWithSession = new NextRequest(req.url, {
			headers
		});

		// If next middleware is provided, call it with the enhanced request
		if (next) {
			const response = await next(reqWithSession);
			return response;
		}
	  
		return NextResponse.next({
			request: { headers }
		});
	};

export default createAuthMiddleware;

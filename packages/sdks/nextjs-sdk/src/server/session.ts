import descopeSdk, { AuthenticationInfo } from '@descope/node-sdk';
import { NextApiRequest } from 'next';
import { cookies, headers } from 'next/headers';
import { getGlobalSdk, CreateSdkParams } from './sdk';
import { LogLevel } from '../types';
import { logger, setLogger } from './logger';

type SessionConfig = CreateSdkParams & {
	// The log level to use for the middleware
	// Defaults to 'info'
	logLevel?: LogLevel;

	// The name of the session cookie to look for the JWT
	// Defaults to 'DS'
	// Note: The middleware will also look for the JWT in the Authorization header
	sessionCookieName?: string;

	// The name of the refresh token cookie
	// Defaults to 'DSR'
	refreshTokenCookieName?: string;

	// The Resource identifier (OAuth Resource Server) to validate the JWT audience against.
	// Required when using Inbound Apps scoped to a specific Resource.
	// Should match the resource identifier configured in the Descope console.
	// Accepts a single resource identifier or an array for multi-audience scenarios.
	resource?: string | string[];
};

const getSessionCookieName = (config?: SessionConfig) =>
	config?.sessionCookieName || descopeSdk.SessionTokenCookieName;

// tries to validate the Authorization header,
// if it doesn't exist or is invalid, it will attempt to validate the session cookie
const getSessionFromAuthorizationOrCookie = async (
	authorization: string | null | undefined,
	cookieJwt: string | undefined,
	config?: SessionConfig
): Promise<AuthenticationInfo | undefined> => {
	const sessionJwt = authorization?.split(' ')[1];
	if (sessionJwt) {
		try {
			const sdk = getGlobalSdk(config);
			return await sdk.validateJwt(sessionJwt, { audience: config?.resource });
		} catch (err) {
			logger.debug('Error validating session from Authorization header', err);
		}
	}

	logger.debug('attempting to get session from cookie');
	if (!cookieJwt) {
		logger.debug('Session cookie not found');
		return undefined;
	}
	try {
		const sdk = getGlobalSdk(config);
		return await sdk.validateJwt(cookieJwt, { audience: config?.resource });
	} catch (err) {
		logger.debug('Error getting session from cookie', err);
		return undefined;
	}
};

// returns the session token if it exists in the Authorization header or cookie
export const session = async (
	config?: SessionConfig
): Promise<AuthenticationInfo | undefined> => {
	setLogger(config?.logLevel);
	const reqHeaders = await headers();
	const cookieJwt = (await cookies()).get(getSessionCookieName(config))?.value;
	return getSessionFromAuthorizationOrCookie(
		reqHeaders.get('Authorization'),
		cookieJwt,
		config
	);
};

// returns the session token if it exists in the request Authorization header or cookie
export const getSession = async (
	req: NextApiRequest,
	config?: SessionConfig
): Promise<AuthenticationInfo | undefined> => {
	setLogger(config?.logLevel);
	const { authorization } = req.headers;
	return getSessionFromAuthorizationOrCookie(
		typeof authorization === 'string' ? authorization : undefined,
		// Pages Router request - next/headers cookies() is not available here,
		// so the session cookie must be read directly from the request
		req.cookies?.[getSessionCookieName(config)],
		config
	);
};

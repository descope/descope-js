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
};

const getSessionFromCookie = async (
	config?: SessionConfig
): Promise<AuthenticationInfo | undefined> => {
	logger.debug('attempting to get session from cookie');
	try {
		const sessionCookie = (await cookies()).get(
			config?.sessionCookieName || descopeSdk.SessionTokenCookieName
		);
		if (!sessionCookie?.value) {
			logger.debug('Session cookie not found');
			return undefined;
		}
		const sdk = getGlobalSdk(config);
		return await sdk.validateJwt(sessionCookie.value);
	} catch (err) {
		logger.debug('Error getting session from cookie', err);
		return undefined;
	}
};

// tries to validate the Authorization header,
// if it doesn't exist or is invalid, it will attempt to get the session from the cookie
const getSessionFromAuthorizationOrCookie = async (
	authorization?: string | null,
	config?: SessionConfig
): Promise<AuthenticationInfo | undefined> => {
	const sessionJwt = authorization?.split(' ')[1];
	if (sessionJwt) {
		try {
			const sdk = getGlobalSdk(config);
			return await sdk.validateJwt(sessionJwt);
		} catch (err) {
			logger.debug('Error validating session from Authorization header', err);
		}
	}

	return getSessionFromCookie(config);
};

// returns the session token if it exists in the Authorization header or cookie
export const session = async (
	config?: SessionConfig
): Promise<AuthenticationInfo | undefined> => {
	setLogger(config?.logLevel);
	const reqHeaders = await headers();
	return getSessionFromAuthorizationOrCookie(
		reqHeaders.get('Authorization'),
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
		config
	);
};

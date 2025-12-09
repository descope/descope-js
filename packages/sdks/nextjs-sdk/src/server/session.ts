import descopeSdk, { AuthenticationInfo } from '@descope/node-sdk';
import { NextApiRequest } from 'next';
import { cookies, headers } from 'next/headers';
import { DESCOPE_SESSION_HEADER } from './constants';
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

const extractSession = (
	descopeSession?: string
): AuthenticationInfo | undefined => {
	if (!descopeSession) {
		return undefined;
	}
	try {
		const authInfo = JSON.parse(
			Buffer.from(descopeSession, 'base64').toString()
		) as AuthenticationInfo;
		return authInfo;
	} catch (err) {
		return undefined;
	}
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

// tries to extract the session header,
// if it doesn't exist, it will attempt to get the session from the cookie
const extractOrGetSession = async (
	sessionHeader?: string,
	config?: SessionConfig
): Promise<AuthenticationInfo | undefined> => {
	const session = extractSession(sessionHeader);
	if (session) {
		return session;
	}

	return getSessionFromCookie(config);
};

// returns the session token if it exists in the headers
export const session = async (
	config?: SessionConfig
): Promise<AuthenticationInfo | undefined> => {
	setLogger(config?.logLevel);
	// first attempt to get the session from the headers
	const reqHeaders = await headers();
	const sessionHeader = reqHeaders.get(DESCOPE_SESSION_HEADER);
	return extractOrGetSession(sessionHeader, config);
};

// returns the session token if it exists in the request headers
export const getSession = async (
	req: NextApiRequest,
	config?: SessionConfig
): Promise<AuthenticationInfo | undefined> => {
	setLogger(config?.logLevel);
	return extractOrGetSession(
		req.headers[DESCOPE_SESSION_HEADER.toLowerCase()] as string,
		config
	);
};

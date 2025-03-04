/* eslint-disable no-console */
import descopeSdk, { AuthenticationInfo } from '@descope/node-sdk';
import { NextApiRequest } from 'next';
import { cookies, headers } from 'next/headers';
import { DESCOPE_SESSION_HEADER } from './constants';
import { getGlobalSdk, CreateSdkParams } from './sdk';

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
	config?: CreateSdkParams
): Promise<AuthenticationInfo | undefined> => {
	try {
		const sessionCookie = (await cookies()).get(
			descopeSdk.SessionTokenCookieName
		);
		if (!sessionCookie?.value) {
			console.debug('Session cookie not found');
			return undefined;
		}
		const sdk = getGlobalSdk(config);
		const res = await sdk.validateJwt(sessionCookie.value);
		return res;
	} catch (err) {
		console.debug('Error getting session from cookie', err);
		return undefined;
	}
};

// tries to extract the session header,
// if it doesn't exist, it will attempt to get the session from the cookie
const extractOrGetSession = async (
	sessionHeader?: string,
	config?: CreateSdkParams
): Promise<AuthenticationInfo | undefined> => {
	const session = extractSession(sessionHeader);
	if (session) {
		return session;
	}

	return getSessionFromCookie(config);
};

// returns the session token if it exists in the headers
export const session = async (
	config?: CreateSdkParams
): Promise<AuthenticationInfo | undefined> => {
	// first attempt to get the session from the headers
	const reqHeaders = await headers();
	const sessionHeader = reqHeaders.get(DESCOPE_SESSION_HEADER);
	return extractOrGetSession(sessionHeader, config);
};

// returns the session token if it exists in the request headers
export const getSession = async (
	req: NextApiRequest,
	config?: CreateSdkParams
): Promise<AuthenticationInfo | undefined> =>
	extractOrGetSession(
		req.headers[DESCOPE_SESSION_HEADER.toLowerCase()] as string,
		config
	);

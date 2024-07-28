import { AuthenticationInfo } from '@descope/node-sdk';
import { NextApiRequest } from 'next';
import { headers } from 'next/headers';
import { DESCOPE_SESSION_HEADER } from './constants';

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
// returns the session token if it exists in the headers
// This function require middleware
export const session = (): AuthenticationInfo | undefined => {
	const sessionHeader = headers()?.get(DESCOPE_SESSION_HEADER);
	return extractSession(sessionHeader);
};

// returns the session token if it exists in the request headers
// This function require middleware
export const getSession = (
	req: NextApiRequest
): AuthenticationInfo | undefined =>
	extractSession(req.headers[DESCOPE_SESSION_HEADER.toLowerCase()] as string);

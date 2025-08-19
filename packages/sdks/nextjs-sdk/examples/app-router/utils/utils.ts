import { BeforeRequest } from './../../../../core-js-sdk/src/httpClient/types';
import { getSessionToken, useDescope } from '@descope/nextjs-sdk/client';
import type { RequestConfig } from '@descope/core-js-sdk'; //

function getUserIdFromToken() {
	const token = getSessionToken();
	if (!token) {
		return '';
	}
	try {
		const payload = token.split('.')[1];
		const decodedPayload = atob(payload);
		const parsedPayload = JSON.parse(decodedPayload);
		return parsedPayload?.sub;
	} catch (error) {
		return '';
	}
}

export const logger = {
	debug: (...args: any[]) => {
		// console.debug(...args);
		if (args?.[0]?.includes('Setting session cookie')) {
			const userId = getUserIdFromToken();
			console.debug('@@@ set cookie', { userId, ...args });
		}
	},
	warn: (...args: any[]) => {
		console.warn(...args);
		if (args?.[0]?.includes('Failed to set cookie')) {
			const userId = getUserIdFromToken();
			console.warn('@@@ failed to set cookie', { userId, ...args });
		}
	},
	info: (...args: any[]) => {
		console.log(...args);
	},
	error: (...args: any[]) => {
		console.error(...args);
	},
	log: (...args: any[]) => {
		// console.log(...args);
	}
};

export const hooks = {
	// add beforeRequest and afterRequest hooks
	beforeRequest: (request: RequestConfig): RequestConfig => {
		const userId = getUserIdFromToken();
		if (request.path?.includes('refresh') && userId) {
			console.log('@@@ refresh token request', { userId });
		}
		return request;
	},
	afterRequest: (req: RequestConfig, res: Response) => {
		if (req.path?.includes('refresh') && res.ok) {
			res.json().then((data) => {
				const userId = getUserIdFromToken();
				console.log('@@@ refresh token response', { userId, data });
			});
		}
	}
};

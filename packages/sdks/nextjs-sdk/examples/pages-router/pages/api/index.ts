import { createSdk, getSession } from '@descope/nextjs-sdk/server';
import type { NextApiRequest, NextApiResponse } from 'next';

const sdk = createSdk({
	projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID,
	baseUrl: process.env.NEXT_PUBLIC_DESCOPE_BASE_URL,
	managementKey: process.env.DESCOPE_MANAGEMENT_KEY
});

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const currentSession = getSession(req);
	if (!currentSession) {
		return res.status(401).json({ message: 'Unauthorized' });
	}

	if (!sdk.management) {
		// eslint-disable-next-line no-console
		console.error(
			'Management SDK is not available, Make sure you have the DESCOPE_MANAGEMENT_KEY environment variable set'
		);
		return res.status(500).json({ message: 'Internal error' });
	}

	const userRes = await sdk.management.user.loadByUserId(
		currentSession.token.sub
	);
	if (!userRes.ok) {
		// eslint-disable-next-line no-console
		console.error('Failed to load user', userRes.error);
		return res.status(404).json({ message: 'Not found' });
	}

	return res.status(200).json(userRes.data);
};

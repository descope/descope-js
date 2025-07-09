import { session } from '@descope/nextjs-sdk/server';
import { headers } from 'next/headers';

export const GET = async () => {
	const allHeaders = await headers();
	const projectId =
		allHeaders.get('x-descope-project-id') ||
		process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;
	const currentSession = await session({
		projectId,
		logLevel: process.env.DESCOPE_LOG_LEVEL as any
	});
	if (!currentSession) {
		return new Response('Unauthorized', { status: 401 });
	}

	return new Response(JSON.stringify(currentSession, null, 2), { status: 200 });
};

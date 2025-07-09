import { authMiddleware } from '@descope/nextjs-sdk/server';
import { NextRequest } from 'next/server';

export const middleware = async (request: NextRequest) => {
	// get `x-descope-project-id header` from the request
	const projectId =
		request.headers.get('x-descope-project-id') ||
		process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;
	console.debug('middleware project-id:', projectId);
	const auth = authMiddleware({
		projectId,
		baseUrl: process.env.NEXT_PUBLIC_DESCOPE_BASE_URL,
		logLevel: process.env.DESCOPE_LOG_LEVEL as any
	});

	const response = await auth(request);
	// set the `x-descope-project-id` header in the response
	if (projectId) {
		response.headers.set('x-descope-project-id', projectId);
	}
	return response;
};

export const config = {
	matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
};

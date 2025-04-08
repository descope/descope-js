import { authMiddleware } from '@descope/nextjs-sdk/server';

console.log('@@@ middleware', {
	projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID,
	baseUrl: process.env.NEXT_PUBLIC_DESCOPE_BASE_URL
});
export default authMiddleware({
	projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID,
	baseUrl: process.env.NEXT_PUBLIC_DESCOPE_BASE_URL,
	logLevel: 'debug'
});

export const config = {
	matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
};

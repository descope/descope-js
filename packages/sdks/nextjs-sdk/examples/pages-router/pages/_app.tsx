import { AuthProvider } from '@descope/nextjs-sdk';
import React from 'react';

export default ({
	Component,
	pageProps
}: {
	Component: any;
	pageProps: any;
}) => {
	return (
		<AuthProvider
			projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID}
			baseUrl={process.env.NEXT_PUBLIC_DESCOPE_BASE_URL}
			baseStaticUrl={process.env.NEXT_PUBLIC_DESCOPE_BASE_STATIC_URL}
		>
			<Component {...pageProps} />
		</AuthProvider>
	);
};

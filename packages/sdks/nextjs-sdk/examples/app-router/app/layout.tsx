import React from 'react';
import DescopeAuthProvider from './DescopeAuthProvider';

export const metadata = {
	title: 'Descope Next.js'
};

export default ({ children }: { children: React.ReactNode }) => {
	return (
		<DescopeAuthProvider
			projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID}
			baseUrl={process.env.NEXT_PUBLIC_DESCOPE_BASE_URL}
			baseStaticUrl={process.env.NEXT_PUBLIC_DESCOPE_BASE_STATIC_URL}
			sessionTokenViaCookie={{ sameSite: 'Lax' }}
		>
			<html lang="en">
				<body>{children}</body>
			</html>
		</DescopeAuthProvider>
	);
};

import { Descope } from '@descope/nextjs-sdk';
import { useSession } from '@descope/nextjs-sdk/client';
import React from 'react';

export default () => {
	useSession();
	return (
		<div>
			<h1>Pages Router Login</h1>
			<Descope
				flowId={process.env.NEXT_PUBLIC_DESCOPE_FLOW_ID || 'sign-up-or-in'}
				redirectAfterSuccess="/"
			/>
		</div>
	);
};

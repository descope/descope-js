import { Descope } from '@descope/nextjs-sdk';
import React from 'react';

export default () => {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100vh'
			}}
		>
			<h1>App Router Login</h1>
			{/* Note that if the component is rendered on the server
			you cannot pass onSuccess/onError callbacks because they are not serializable. */}
			<Descope
				flowId={process.env.NEXT_PUBLIC_DESCOPE_FLOW_ID || 'sign-up-or-in'}
				redirectAfterSuccess="/"
			/>
		</div>
	);
};

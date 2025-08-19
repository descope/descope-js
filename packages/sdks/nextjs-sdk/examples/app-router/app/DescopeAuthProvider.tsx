'use client';

import { useCallback } from 'react';
import { AuthProvider } from '@descope/nextjs-sdk';
import { logger, hooks } from '../utils/utils';

// Wrapper to inject debugging logs and hooks
type AuthProviderProps = React.ComponentProps<typeof AuthProvider>;
const DescopeAuthProvider = (props: AuthProviderProps) => {
	const { children, ...rest } = props;

	return (
		<AuthProvider {...rest} logger={logger} hooks={hooks}>
			{children}
		</AuthProvider>
	);
};

export default DescopeAuthProvider;

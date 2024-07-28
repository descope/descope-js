'use client';

// export most of the things from the SDK
// we don't need to export AuthProvider, as it is exported from the root index.ts
export {
	useDescope,
	useSession,
	useUser,
	getSessionToken,
	getRefreshToken,
	isSessionTokenExpired,
	isRefreshTokenExpired,
	getJwtPermissions,
	getJwtRoles,
	refresh
} from '@descope/react-sdk';

/* eslint-disable import/no-namespace */
import * as clientIndex from '../src/client/index';
import * as serverIndex from '../src/server/index';
import * as sharedIndex from '../src/index';

describe('index', () => {
	it('should import the correct things from client', () => {
		expect(clientIndex).toHaveProperty('useDescope');
		expect(clientIndex).toHaveProperty('useSession');
		expect(clientIndex).toHaveProperty('useUser');
		expect(clientIndex).toHaveProperty('getSessionToken');
		expect(clientIndex).toHaveProperty('getRefreshToken');
		expect(clientIndex).toHaveProperty('isSessionTokenExpired');
		expect(clientIndex).toHaveProperty('isRefreshTokenExpired');
		expect(clientIndex).toHaveProperty('getJwtPermissions');
		expect(clientIndex).toHaveProperty('getJwtRoles');
		expect(clientIndex).toHaveProperty('refresh');
	});

	it('should import the correct things from server', () => {
		// Need to fix babel/jest to get this working
		expect(serverIndex).toHaveProperty('authMiddleware');
		expect(serverIndex).toHaveProperty('createSdk');
		expect(serverIndex).toHaveProperty('session');
		expect(serverIndex).toHaveProperty('getSession');
	});

	it('should import the correct things from shared', () => {
		expect(sharedIndex).toHaveProperty('AuthProvider');
		expect(sharedIndex).toHaveProperty('Descope');
		expect(sharedIndex).toHaveProperty('SignInFlow');
		expect(sharedIndex).toHaveProperty('SignUpFlow');
		expect(sharedIndex).toHaveProperty('SignUpOrInFlow');
	});
});

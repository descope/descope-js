import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import {
	AuthProvider as AuthProviderComp,
	baseHeaders
} from '@descope/react-sdk';
import AuthProvider from '../../src/shared/AuthProvider';
import { baseHeaders as nextBaseHeaders } from '../../src/shared/constants';

jest.mock('@descope/react-sdk', () => ({
	AuthProvider: jest.fn(),
	baseHeaders: {}
}));

describe('AuthProvider', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should set base headers', () => {
		render(<AuthProvider projectId="project1" />);
		expect(baseHeaders).toEqual(nextBaseHeaders);
	});

	it('should render and pass sessionTokenViaCookie with sameSite Lax by default', () => {
		render(<AuthProvider projectId="project1" />);
		expect(AuthProviderComp).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionTokenViaCookie: { sameSite: 'Lax' }
			}),
			expect.anything() // This accounts for the second argument to a component function, which is the ref in class components
		);
	});

	it('should allow sessionTokenViaCookie to be overridden to false', () => {
		render(<AuthProvider projectId="project1" sessionTokenViaCookie={false} />);
		expect(AuthProviderComp).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionTokenViaCookie: false
			}),
			expect.anything()
		);
	});

	it('should pass both sessionTokenViaCookie and refreshTokenViaCookie with sameSite Lax by default', () => {
		render(<AuthProvider projectId="project1" />);
		expect(AuthProviderComp).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionTokenViaCookie: { sameSite: 'Lax' },
				refreshTokenViaCookie: { sameSite: 'Lax' }
			}),
			expect.anything()
		);
	});

	it('should allow refreshTokenViaCookie to be overridden with different value', () => {
		render(
			<AuthProvider
				projectId="project1"
				refreshTokenViaCookie={{ sameSite: 'Strict', secure: true }}
			/>
		);
		expect(AuthProviderComp).toHaveBeenCalledWith(
			expect.objectContaining({
				refreshTokenViaCookie: { sameSite: 'Strict', secure: true }
			}),
			expect.anything()
		);
	});

	it('should allow refreshTokenViaCookie to be overridden to false', () => {
		render(<AuthProvider projectId="project1" refreshTokenViaCookie={false} />);
		expect(AuthProviderComp).toHaveBeenCalledWith(
			expect.objectContaining({
				refreshTokenViaCookie: false
			}),
			expect.anything()
		);
	});
});

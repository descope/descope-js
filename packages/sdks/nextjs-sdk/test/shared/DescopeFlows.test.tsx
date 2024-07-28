/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthProvider from '../../src/shared/AuthProvider';
import { Descope } from '../../src/shared/DescopeFlows';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
	useRouter: jest.fn(() => ({ push: mockPush }))
}));

jest.mock('@descope/web-component', () => ({ default: {} }));

describe('Descope Flows', () => {
	beforeEach(() => {
		mockPush.mockClear();
	});

	it('should trigger onSuccess callback and redirect on success event', async () => {
		const onSuccessMock = jest.fn();
		render(
			<AuthProvider projectId="project1">
				<Descope
					flowId="flow1"
					onSuccess={onSuccessMock}
					redirectAfterSuccess="/success-path"
				/>
			</AuthProvider>
		);

		// Wait for the Descope web component to be in the document
		await waitFor(() =>
			expect(document.querySelector('descope-wc')).toBeInTheDocument()
		);

		// Simulate the success event
		fireEvent(
			(document as any).querySelector('descope-wc'),
			new CustomEvent('success', { detail: { some: 'data' } })
		);

		await waitFor(() => {
			expect(onSuccessMock).toHaveBeenCalledWith(
				expect.objectContaining({ detail: { some: 'data' } })
			);
		});

		expect(mockPush).toHaveBeenCalledWith('/success-path');
	});

	it('should trigger onError callback and redirect on error event', async () => {
		const onErrorMock = jest.fn();
		render(
			<AuthProvider projectId="project1">
				<Descope
					flowId="flow1"
					onError={onErrorMock}
					redirectAfterError="/error-path"
				/>
			</AuthProvider>
		);

		// Wait for the Descope web component to be in the document
		await waitFor(() =>
			expect(document.querySelector('descope-wc')).toBeInTheDocument()
		);

		// Simulate the error event
		fireEvent(
			(document as any).querySelector('descope-wc'),
			new CustomEvent('error', { detail: { error: 'error-details' } })
		);

		await waitFor(() => {
			expect(onErrorMock).toHaveBeenCalledWith(
				expect.objectContaining({ detail: { error: 'error-details' } })
			);
		});
		expect(mockPush).toHaveBeenCalledWith('/error-path');
	});
});

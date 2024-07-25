/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthProvider from '../../src/shared/AuthProvider';
import {
	UserManagement,
	RoleManagement,
	AccessKeyManagement,
	AuditManagement,
	UserProfile
} from '../../src/shared/DescopeWidgets';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
	useRouter: jest.fn(() => ({ push: mockPush }))
}));

describe('Descope Widgets', () => {
	beforeEach(() => {
		mockPush.mockClear();
	});

	it('render UserManagement', async () => {
		render(
			<AuthProvider projectId="project1">
				<UserManagement tenant="tenant1" widgetId="widget1" />
			</AuthProvider>
		);

		// Wait for the web component to be in the document
		await waitFor(() =>
			expect(
				document.querySelector('descope-user-management-widget')
			).toBeInTheDocument()
		);
	});

	it('render RoleManagement', async () => {
		render(
			<AuthProvider projectId="project1">
				<RoleManagement tenant="tenant1" widgetId="widget1" />
			</AuthProvider>
		);

		// Wait for the web component to be in the document
		await waitFor(() =>
			expect(
				document.querySelector('descope-role-management-widget')
			).toBeInTheDocument()
		);
	});

	it('render AccessKeyManagement', async () => {
		render(
			<AuthProvider projectId="project1">
				<AccessKeyManagement tenant="tenant1" widgetId="widget1" />
			</AuthProvider>
		);

		// Wait for the web component to be in the document
		await waitFor(() =>
			expect(
				document.querySelector('descope-access-key-management-widget')
			).toBeInTheDocument()
		);
	});

	it('render AuditManagement', async () => {
		render(
			<AuthProvider projectId="project1">
				<AuditManagement tenant="tenant1" widgetId="widget1" />
			</AuthProvider>
		);

		// Wait for the web component to be in the document
		await waitFor(() =>
			expect(
				document.querySelector('descope-audit-management-widget')
			).toBeInTheDocument()
		);
	});

	it('render UserProfile', async () => {
		render(
			<AuthProvider projectId="project1">
				<UserProfile widgetId="widget1" />
			</AuthProvider>
		);

		// Wait for the web component to be in the document
		await waitFor(() =>
			expect(
				document.querySelector('descope-user-profile-widget')
			).toBeInTheDocument()
		);
	});
});

/* eslint-disable testing-library/no-node-access */
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import {
  AccessKeyManagement,
  ApplicationsPortal,
  AuditManagement,
  RoleManagement,
  TenantProfile,
  UserManagement,
  UserProfile,
} from '../../src';
import AuthProvider from '../../src/components/AuthProvider';
import Context from '../../src/hooks/Context';

Object.defineProperty(global, 'Response', {
  value: class {},
  configurable: true,
  writable: true,
});

// mock all the descope widgets
jest.mock('@descope/user-management-widget', () => ({ default: {} }));
jest.mock('@descope/role-management-widget', () => ({ default: {} }));
jest.mock('@descope/access-key-management-widget', () => ({ default: {} }));
jest.mock('@descope/audit-management-widget', () => ({ default: {} }));
jest.mock('@descope/user-profile-widget', () => ({ default: {} }));
jest.mock('@descope/applications-portal-widget', () => ({ default: {} }));
jest.mock('@descope/tenant-profile-widget', () => ({ default: {} }));

jest.mock('@descope/web-js-sdk', () => {
  const sdk = {
    logout: jest.fn().mockName('logout'),
    onSessionTokenChange: jest
      .fn(() => () => {})
      .mockName('onSessionTokenChange'),
    onIsAuthenticatedChange: jest
      .fn(() => () => {})
      .mockName('onIsAuthenticatedChange'),
    onUserChange: jest.fn(() => () => {}).mockName('onUserChange'),
    onClaimsChange: jest.fn(() => () => {}).mockName('onClaimsChange'),
    refresh: jest.fn(),
    httpClient: {
      hooks: {
        beforeRequest: jest.fn().mockName('before-request-hook'),
        afterRequest: jest.fn().mockName('after-request-hook'),
      },
    },
  };
  return { createSdk: jest.fn(() => sdk) };
});

const renderWithProvider = (
  ui: React.ReactElement,
  projectId: string = 'project1',
  refreshCookieName?: string,
) =>
  render(
    <AuthProvider projectId={projectId} refreshCookieName={refreshCookieName}>
      {ui}
    </AuthProvider>,
  );

describe('Descope Widgets', () => {
  it('render User Management', async () => {
    renderWithProvider(
      <UserManagement tenant="tenant1" widgetId="widget1" />,
      undefined,
      'cookie-1',
    );

    // Wait for the web component to be in the document
    await waitFor(() =>
      expect(
        document.querySelector('descope-user-management-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-user-management-widget');
    expect(widget).toHaveAttribute('tenant', 'tenant1');
    expect(widget).toHaveAttribute('widget-id', 'widget1');
    expect(widget).toHaveAttribute('refresh-cookie-name', 'cookie-1');
  });

  it('render Role Management', async () => {
    renderWithProvider(
      <RoleManagement tenant="tenant1" widgetId="widget1" />,
      undefined,
      'cookie-1',
    );

    // Wait for the web component to be in the document
    await waitFor(() =>
      expect(
        document.querySelector('descope-role-management-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-role-management-widget');
    expect(widget).toHaveAttribute('tenant', 'tenant1');
    expect(widget).toHaveAttribute('widget-id', 'widget1');
    expect(widget).toHaveAttribute('refresh-cookie-name', 'cookie-1');
  });

  it('render Access Key Management', async () => {
    renderWithProvider(
      <AccessKeyManagement tenant="tenant1" widgetId="widget1" />,
      undefined,
      'cookie-1',
    );

    // Wait for the web component to be in the document
    await waitFor(() =>
      expect(
        document.querySelector('descope-access-key-management-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector(
      'descope-access-key-management-widget',
    );
    expect(widget).toHaveAttribute('tenant', 'tenant1');
    expect(widget).toHaveAttribute('widget-id', 'widget1');
    expect(widget).toHaveAttribute('refresh-cookie-name', 'cookie-1');
  });

  it('render Audit Management', async () => {
    renderWithProvider(
      <AuditManagement tenant="tenant1" widgetId="widget1" />,
      undefined,
      'cookie-1',
    );

    // Wait for the web component to be in the document
    await waitFor(() =>
      expect(
        document.querySelector('descope-audit-management-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-audit-management-widget');
    expect(widget).toHaveAttribute('tenant', 'tenant1');
    expect(widget).toHaveAttribute('widget-id', 'widget1');
    expect(widget).toHaveAttribute('refresh-cookie-name', 'cookie-1');
  });

  it('render Tenant Profile', async () => {
    renderWithProvider(
      <TenantProfile widgetId="widget1" tenant="tenant1" />,
      undefined,
      'cookie-1',
    );

    // Wait for the web component to be in the document
    await waitFor(() =>
      expect(
        document.querySelector('descope-tenant-profile-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-tenant-profile-widget');
    expect(widget).toHaveAttribute('tenant', 'tenant1');
    expect(widget).toHaveAttribute('widget-id', 'widget1');
    expect(widget).toHaveAttribute('refresh-cookie-name', 'cookie-1');
  });

  it('render User Profile', async () => {
    renderWithProvider(
      <UserProfile widgetId="widget1" />,
      undefined,
      'cookie-1',
    );

    // Wait for the web component to be in the document
    await waitFor(() =>
      expect(
        document.querySelector('descope-user-profile-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-user-profile-widget');
    expect(widget).toHaveAttribute('widget-id', 'widget1');
    expect(widget).toHaveAttribute('refresh-cookie-name', 'cookie-1');
  });

  it('render User Profile and triggers logout', async () => {
    const setIsAuthenticatedMock = jest.fn();
    const setSessionMock = jest.fn();
    const setUserMock = jest.fn();
    const contextValue = {
      projectId: 'project1',
      setIsAuthenticated: setIsAuthenticatedMock,
      setSession: setSessionMock,
      setUser: setUserMock,
    };

    const { container } = render(
      <Context.Provider value={contextValue}>
        <UserProfile widgetId="widget1" />
      </Context.Provider>,
    );

    await waitFor(() =>
      expect(
        container.querySelector('descope-user-profile-widget'),
      ).toBeInTheDocument(),
    );

    const widget = container.querySelector('descope-user-profile-widget');
    // Dispatch logout event
    widget.dispatchEvent(new CustomEvent('logout', { bubbles: true }));
    expect(setIsAuthenticatedMock).toHaveBeenCalledWith(false);
    expect(setSessionMock).toHaveBeenCalledWith('');
    expect(setUserMock).toHaveBeenCalledWith(null);
  });

  it('render ApplicationsPortal', async () => {
    renderWithProvider(
      <ApplicationsPortal widgetId="widget1" />,
      undefined,
      'cookie-1',
    );

    // Wait for the web component to be in the document
    await waitFor(() =>
      expect(
        document.querySelector('descope-applications-portal-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-applications-portal-widget');
    expect(widget).toHaveAttribute('widget-id', 'widget1');
    expect(widget).toHaveAttribute('refresh-cookie-name', 'cookie-1');
  });

  it('should call onReady callback when ready event is dispatched - UserManagement', async () => {
    const onReadyMock = jest.fn();
    renderWithProvider(
      <UserManagement tenant="tenant1" widgetId="widget1" onReady={onReadyMock} />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('descope-user-management-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-user-management-widget')!;
    widget.dispatchEvent(new CustomEvent('ready'));
    expect(onReadyMock).toHaveBeenCalledTimes(1);
  });

  it('should call onReady callback when ready event is dispatched - RoleManagement', async () => {
    const onReadyMock = jest.fn();
    renderWithProvider(
      <RoleManagement tenant="tenant1" widgetId="widget1" onReady={onReadyMock} />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('descope-role-management-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-role-management-widget')!;
    widget.dispatchEvent(new CustomEvent('ready'));
    expect(onReadyMock).toHaveBeenCalledTimes(1);
  });

  it('should call onReady callback when ready event is dispatched - AccessKeyManagement', async () => {
    const onReadyMock = jest.fn();
    renderWithProvider(
      <AccessKeyManagement tenant="tenant1" widgetId="widget1" onReady={onReadyMock} />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('descope-access-key-management-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-access-key-management-widget')!;
    widget.dispatchEvent(new CustomEvent('ready'));
    expect(onReadyMock).toHaveBeenCalledTimes(1);
  });

  it('should call onReady callback when ready event is dispatched - AuditManagement', async () => {
    const onReadyMock = jest.fn();
    renderWithProvider(
      <AuditManagement tenant="tenant1" widgetId="widget1" onReady={onReadyMock} />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('descope-audit-management-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-audit-management-widget')!;
    widget.dispatchEvent(new CustomEvent('ready'));
    expect(onReadyMock).toHaveBeenCalledTimes(1);
  });

  it('should call onReady callback when ready event is dispatched - TenantProfile', async () => {
    const onReadyMock = jest.fn();
    renderWithProvider(
      <TenantProfile widgetId="widget1" tenant="tenant1" onReady={onReadyMock} />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('descope-tenant-profile-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-tenant-profile-widget')!;
    widget.dispatchEvent(new CustomEvent('ready'));
    expect(onReadyMock).toHaveBeenCalledTimes(1);
  });

  it('should call onReady callback when ready event is dispatched - UserProfile', async () => {
    const onReadyMock = jest.fn();
    renderWithProvider(
      <UserProfile widgetId="widget1" onReady={onReadyMock} />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('descope-user-profile-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-user-profile-widget')!;
    widget.dispatchEvent(new CustomEvent('ready'));
    expect(onReadyMock).toHaveBeenCalledTimes(1);
  });

  it('should call onReady callback when ready event is dispatched - ApplicationsPortal', async () => {
    const onReadyMock = jest.fn();
    renderWithProvider(
      <ApplicationsPortal widgetId="widget1" onReady={onReadyMock} />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('descope-applications-portal-widget'),
      ).toBeInTheDocument(),
    );

    const widget = document.querySelector('descope-applications-portal-widget')!;
    widget.dispatchEvent(new CustomEvent('ready'));
    expect(onReadyMock).toHaveBeenCalledTimes(1);
  });
});

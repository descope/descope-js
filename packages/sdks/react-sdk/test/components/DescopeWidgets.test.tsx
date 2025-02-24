/* eslint-disable testing-library/no-node-access */
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import AuthProvider from '../../src/components/AuthProvider';
import {
  AccessKeyManagement,
  ApplicationsPortal,
  AuditManagement,
  RoleManagement,
  UserManagement,
  UserProfile,
} from '../../src';

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

jest.mock('@descope/web-js-sdk', () => {
  const sdk = {
    logout: jest.fn().mockName('logout'),
    onSessionTokenChange: jest
      .fn(() => () => {})
      .mockName('onSessionTokenChange'),
    onUserChange: jest.fn(() => () => {}).mockName('onUserChange'),
    refresh: jest.fn(),
    httpClient: {
      hooks: {
        beforeRequest: jest.fn().mockName('before-request-hook'),
        afterRequest: jest.fn().mockName('after-request-hook'),
      },
    },
  };
  return jest.fn(() => sdk);
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
});

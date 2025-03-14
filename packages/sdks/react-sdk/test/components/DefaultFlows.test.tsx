/* eslint-disable testing-library/no-node-access */ import {
  render,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import AuthProvider from '../../src/components/AuthProvider';
import { SignInFlow, SignUpFlow, SignUpOrInFlow } from '../../src';

jest.mock('@descope/web-component', () => ({ default: {} }));

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
    refresh: jest.fn(),
    httpClient: {
      hooks: {
        afterRequest: jest.fn(),
      },
    },
  };
  return () => sdk;
});

const renderWithProvider = (ui: React.ReactElement, projectId: string) =>
  // eslint-disable-next-line testing-library/no-unnecessary-act
  render(<AuthProvider projectId={projectId}>{ui}</AuthProvider>);

describe('Default Flows', () => {
  it('should render Sign In with the correct props and flow', async () => {
    renderWithProvider(<SignInFlow />, 'proj1');
    await waitFor(() => {
      expect(document.querySelector('descope-wc')).toBeInTheDocument();
    });
    expect(document.querySelector('descope-wc')).toHaveAttribute(
      'project-id',
      'proj1',
    );
    expect(document.querySelector('descope-wc')).toHaveAttribute(
      'flow-id',
      'sign-in',
    );
  });

  it('should render Sign Up with the correct props and flow', async () => {
    renderWithProvider(<SignUpFlow />, 'proj1');
    await waitFor(() => {
      expect(document.querySelector('descope-wc')).toBeInTheDocument();
    });
    expect(document.querySelector('descope-wc')).toHaveAttribute(
      'project-id',
      'proj1',
    );
    expect(document.querySelector('descope-wc')).toHaveAttribute(
      'flow-id',
      'sign-up',
    );
  });

  it('should render Sign Up Or In In with the correct props and flow', async () => {
    renderWithProvider(<SignUpOrInFlow />, 'proj1');
    await waitFor(() => {
      expect(document.querySelector('descope-wc')).toBeInTheDocument();
    });
    expect(document.querySelector('descope-wc')).toHaveAttribute(
      'project-id',
      'proj1',
    );
    expect(document.querySelector('descope-wc')).toHaveAttribute(
      'flow-id',
      'sign-up-or-in',
    );
  });
});

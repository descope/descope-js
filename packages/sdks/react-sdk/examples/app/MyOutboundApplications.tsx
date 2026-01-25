import type { UserResponse } from '@descope/web-js-sdk';
import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDescope, useUser, OutboundApplications } from '../../src';

const getUserDisplayName = (user?: UserResponse) =>
  user?.name || user?.loginIds?.[0] || '';

const MyOutboundApplications = () => {
  // useUser retrieves the logged in user information
  const { user } = useUser();
  // useDescope retrieves Descope SDK for further operations related to authentication
  // such as logout
  const sdk = useDescope();

  const onLogout = useCallback(() => {
    sdk.logout();
  }, [sdk]);

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid gray',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <p>
          <a href="/">Home</a>
        </p>
        <div>
          <p>
            User:{' '}
            <span style={{ fontWeight: 'bold' }}>
              {getUserDisplayName(user)}
            </span>
          </p>
          <p>
            <button
              type="button"
              id="logout-button"
              onClick={onLogout}
              style={{
                display: 'block',
                marginLeft: 'auto',
                padding: 5,
              }}
            >
              Logout
            </button>
          </p>
          <p>
            {process.env.DESCOPE_STEP_UP_FLOW_ID && (
              <Link id="step-up-button" to="/step-up">
                Step Up
              </Link>
            )}
          </p>
        </div>
      </header>
      <h2>Outbound Applications</h2>
      <OutboundApplications
        widgetId="outbound-applications-widget"
        theme={process.env.DESCOPE_THEME as any}
        tenant={process.env.DESCOPE_TENANT_ID || ''}
        styleId={process.env.DESCOPE_STYLE_ID}
        debug={process.env.DESCOPE_DEBUG_MODE === 'true'}
        logger={console}
      />
    </>
  );
};

export default MyOutboundApplications;

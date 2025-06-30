import type { UserResponse } from '@descope/web-js-sdk';
import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TenantProfile, useDescope, useUser } from '../../src';

const getUserDisplayName = (user?: UserResponse) =>
  user?.name || user?.loginIds?.[0] || '';

const MyTenantProfile = () => {
  const { user } = useUser();
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
      <h2>Tenant Profile</h2>
      <TenantProfile
        widgetId="tenant-profile-widget"
        tenant={process.env.DESCOPE_TENANT_ID!}
        theme={process.env.DESCOPE_THEME as any}
        styleId={process.env.DESCOPE_STYLE_ID}
        debug={process.env.DESCOPE_DEBUG_MODE === 'true'}
        logger={console}
      />
    </>
  );
};

export default MyTenantProfile;

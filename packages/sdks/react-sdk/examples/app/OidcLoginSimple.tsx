/* eslint-disable no-console */
import React, { useCallback, useState } from 'react';
import { useDescope } from '../../src';

const OidcLoginSimple = () => {
  const sdk = useDescope();
  const [errorMessage, setErrorMessage] = useState('');

  const onLogin = useCallback(() => {
    sdk.oidc
      .loginWithRedirect({
        redirect_uri: window.location.origin,
      })
      .then((res) => {
        if (!res.ok) {
          setErrorMessage(JSON.stringify(res.error));
        }
      });
  }, [sdk]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <h2>OIDC Login (Simple)</h2>
      <button
        onClick={onLogin}
        style={{ padding: '10px 16px', cursor: 'pointer' }}
      >
        Start OAuth with Descope (OIDC)
      </button>

      {errorMessage && (
        <div
          className="error"
          style={{
            color: 'red',
            whiteSpace: 'pre-wrap',
            maxWidth: 520,
            textAlign: 'center',
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default OidcLoginSimple;

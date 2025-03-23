/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession, useDescope } from '../../src';

const OidcLogin = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const sdk = useDescope();

  const { isAuthenticated, isSessionLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [navigate, isAuthenticated]);

  const onLogin = useCallback(() => {
    sdk.oidc
      .login({
        redirect_uri: window.location.origin,
      })
      .then((res) => {
        if (!res.ok) {
          setErrorMessage(JSON.stringify(res.error));
          return;
        }
        // the function will redirect the user to the OIDC login page
        // and will return the user to the origin URL after the login
      });
  }, [sdk]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h2>OIDC Login</h2>
      {isSessionLoading && <div>Loading...</div>}
      {!isSessionLoading && (
        <button
          style={{
            padding: '10px',
            margin: '10px',
          }}
          onClick={onLogin}
        >
          Login with OIDC
        </button>
      )}
      {errorMessage && (
        <div
          className="error"
          style={{
            margin: 'auto',
            color: 'red',
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default OidcLogin;

/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession, useDescope } from '../../src';

const OidcLogin = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [searchParams] = useSearchParams();
  const sdk = useDescope();

  const { isAuthenticated, isSessionLoading } = useSession();
  const navigate = useNavigate();

  const isGettingToken = searchParams.has('code');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [navigate, isAuthenticated]);

  const onLogin = useCallback(() => {
    console.log('@@@Logging in with OIDC');
    sdk.oidc.authorize().then((res) => {
      if (!res.ok) {
        setErrorMessage(JSON.stringify(res.error));
        return;
      }
      window.location.href = res.data.url;
    });
  }, [sdk]);

  useEffect(() => {
    // can happen only once, when the user is redirected back from the OIDC provider
    if (isGettingToken) {
      sdk.oidc.token().then((res) => {
        if (!res.ok) {
          setErrorMessage(JSON.stringify(res.error));
          return;
        }
        navigate('/');
      });
    }
  }, []);

  const isLoading = isSessionLoading || isGettingToken;

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
      {isLoading && <div>Loading...</div>}
      {!isLoading && (
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

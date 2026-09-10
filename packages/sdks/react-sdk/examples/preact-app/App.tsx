/* eslint-disable no-console */
import React, { useCallback, useRef, useState } from 'react';
import {
  Descope,
  UserProfile,
  useDescope,
  useSession,
  useUser,
} from '../../src';

const card: React.CSSProperties = {
  borderRadius: 10,
  margin: 'auto',
  border: '1px solid lightgray',
  padding: 20,
  width: '600px',
  background: '#ecf0f3',
};

const Login = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [isFlowLoading, setIsFlowLoading] = useState(true);

  // Exercises the imperative handle - `ref` resolves to the `descope-wc`
  // element, which is what the React SDK exposes through `useImperativeHandle`.
  const flowRef = useRef<HTMLElement>(null);

  const onError = useCallback(
    () => setErrorMessage('Something went wrong'),
    [],
  );
  const onReady = useCallback(() => {
    setIsFlowLoading(false);
    console.log('flow element:', flowRef.current?.tagName);
  }, []);
  const onSuccess = useCallback(
    (e: CustomEvent) => console.log('logged in', e.detail),
    [],
  );

  return (
    <div style={card}>
      <h2>Login</h2>
      {isFlowLoading && <div>Loading...</div>}
      <Descope
        ref={flowRef}
        flowId={process.env.DESCOPE_FLOW_ID || 'sign-up-or-in'}
        onSuccess={onSuccess}
        onError={onError}
        onReady={onReady}
        theme={process.env.DESCOPE_THEME as any}
        styleId={process.env.DESCOPE_STYLE_ID}
        locale={process.env.DESCOPE_LOCALE}
        redirectUrl={process.env.DESCOPE_REDIRECT_URL}
        tenant={process.env.DESCOPE_TENANT_ID}
        debug={process.env.DESCOPE_DEBUG_MODE === 'true'}
        client={{ version: '1.0.2' }}
        logger={console}
      />
      {errorMessage && <div className="error">{errorMessage}</div>}
    </div>
  );
};

const Home = () => {
  const { user, isUserLoading } = useUser();
  const { sessionToken, claims } = useSession();
  const sdk = useDescope();

  const [showProfile, setShowProfile] = useState(false);

  if (isUserLoading) return <div style={card}>Loading user...</div>;

  return (
    <div style={card}>
      <h2>Hello {user?.name || user?.email}</h2>
      <p>Subject claim: {String(claims?.sub)}</p>
      <p>Session token length: {sessionToken?.length ?? 0}</p>

      <button type="button" onClick={() => setShowProfile((v) => !v)}>
        {showProfile ? 'Hide' : 'Show'} profile widget
      </button>
      <button type="button" onClick={() => sdk.logout()}>
        Logout
      </button>

      {/* A widget - another web component behind the same props mapping */}
      {showProfile && (
        <UserProfile
          widgetId="user-profile-widget"
          theme={process.env.DESCOPE_THEME as any}
          logger={console}
        />
      )}
    </div>
  );
};

const App = () => {
  const { isAuthenticated, isSessionLoading } = useSession();

  if (isSessionLoading) return <div style={card}>Loading...</div>;

  return isAuthenticated ? <Home /> : <Login />;
};

export default App;

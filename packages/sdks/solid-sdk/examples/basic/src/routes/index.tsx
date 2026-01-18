import { Show } from 'solid-js';
import { useDescope, useSession, useUser } from '@descope/solid-sdk';

export default function Home() {
  const { isAuthenticated, isSessionLoading } = useSession();
  const { user, isUserLoading } = useUser();
  const sdk = useDescope();

  const handleLogout = async () => {
    await sdk.logout();
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '2rem', 'max-width': '800px', margin: '0 auto' }}>
      <h1>Descope SolidJS SDK Example</h1>

      <Show
        when={!isSessionLoading() && !isUserLoading()}
        fallback={<div>Loading...</div>}
      >
        <Show
          when={isAuthenticated()}
          fallback={
            <div>
              <p>You are not logged in.</p>
              <a href="/login">Go to Login</a>
            </div>
          }
        >
          <div>
            <h2>Welcome, {user()?.name || 'User'}!</h2>
            <p>Email: {user()?.email}</p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </Show>
      </Show>
    </div>
  );
}

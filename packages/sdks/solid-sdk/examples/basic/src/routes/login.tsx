import { useNavigate } from '@solidjs/router';
import { Descope } from '@descope/solid-sdk';

export default function Login() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  const handleError = (e: CustomEvent) => {
    console.error('Login error:', e.detail);
  };

  return (
    <div style={{ padding: '2rem', 'max-width': '500px', margin: '0 auto' }}>
      <h1>Login</h1>
      <Descope
        flowId="sign-up-or-in"
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}

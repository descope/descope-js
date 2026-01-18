import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start/router';
import { Suspense } from 'solid-js';
import { DescopeProvider } from '@descope/solid-sdk';

export default function App() {
  const projectId =
    import.meta.env.VITE_DESCOPE_PROJECT_ID || 'YOUR_PROJECT_ID';

  return (
    <Router
      root={(props) => (
        <DescopeProvider projectId={projectId}>
          <Suspense>{props.children}</Suspense>
        </DescopeProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

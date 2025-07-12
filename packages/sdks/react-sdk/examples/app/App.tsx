import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useSession } from '../../src';
import Home from './Home';
import Login from './Login';
import ManageAccessKeys from './ManageAccessKeys';
import ManageAudit from './ManageAudit';
import ManageRoles from './ManageRoles';
import ManageUsers from './ManageUsers';
import MyApplicationsPortal from './MyApplicationsPortal';
import MyTenantProfile from './MyTenantProfile';
import MyUserProfile from './MyUserProfile';
import OidcLogin from './OidcLogin';
import StepUp from './StepUp';

const Layout = () => (
  <div
    style={{
      height: '100vh',
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <div
      style={{
        borderRadius: 10,
        margin: 'auto',
        border: '1px solid lightgray',
        padding: 20,
        width: '600px',
        boxShadow: '13px 13px 20px #cbced1, -13px -13px 20px #fff',
        background: '#ecf0f3',
        position: 'relative',
      }}
    >
      <Outlet />
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isSessionLoading } = useSession();

  if (isSessionLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    const route = process.env.DESCOPE_OIDC_ENABLED ? '/oidc-login' : '/login';
    return <Navigate to={route} replace />;
  }

  return children;
};

const App = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route
        index
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-management"
        element={
          <ProtectedRoute>
            <ManageUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/role-management"
        element={
          <ProtectedRoute>
            <ManageRoles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/access-key-management"
        element={
          <ProtectedRoute>
            <ManageAccessKeys />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-management"
        element={
          <ProtectedRoute>
            <ManageAudit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-profile"
        element={
          <ProtectedRoute>
            <MyUserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications-portal"
        element={
          <ProtectedRoute>
            <MyApplicationsPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenant-profile"
        element={
          <ProtectedRoute>
            <MyTenantProfile />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/oidc-login" element={<OidcLogin />} />
      <Route path="/step-up" element={<StepUp />} />
    </Route>
  </Routes>
);

export default App;

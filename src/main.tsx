import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import EmployeeView from './components/EmployeeView';
import Login from './pages/Login';
import AuthGuard from './lib/AuthGuard';
import { useAuth } from './lib/useAuth';
import './index.css';

function LoginRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/employee'} replace />;
  }

  return (
    <Login
      onSuccess={(res) => {
        navigate(res.user.role === 'ADMIN' ? '/admin' : '/employee');
      }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/admin/*"
          element={
            <AuthGuard role="ADMIN">
              <AdminLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/employee"
          element={
            <AuthGuard>
              <EmployeeView />
            </AuthGuard>
          }
        />
        <Route path="/" element={<Navigate to="/employee" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);


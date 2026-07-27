import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { Spin } from 'antd';

export default function ProtectedRoute() {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

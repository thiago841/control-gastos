import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user } = useAuth();

  // Si no hay usuario, lo mandamos al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario, renderizamos el contenido protegido (Outlet)
  return <Outlet />;
}
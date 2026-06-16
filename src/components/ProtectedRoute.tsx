import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';
import { hasPermission, type RoleKey } from '../types/roles';

type PermissionKey = keyof typeof import('../types/roles').PERMISSIONS;

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function PermissionRoute({
  children,
  permission,
  fallback = '/dashboard',
}: {
  children: React.ReactNode;
  permission: PermissionKey;
  fallback?: string;
}) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasPermission(user.role as RoleKey, permission)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';

export function Dashboard() {
  const { user, isLoading } = useAuth();

  // Loading guard - check this BEFORE user check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Simple greeting - no stats, no charts, no lead counts
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">
        Hi, Welcome back, {user.name}
      </h1>
    </div>
  );
}

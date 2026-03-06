import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [hasResolvedAuthCheck, setHasResolvedAuthCheck] = useState(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      setHasResolvedAuthCheck(true);
      return;
    }

    let isMounted = true;

    checkAuth().finally(() => {
      if (isMounted) {
        setHasResolvedAuthCheck(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [checkAuth, isAuthenticated]);

  if (isLoading || !hasResolvedAuthCheck) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

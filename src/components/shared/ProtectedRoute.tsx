import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../App';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-screen"><p>Loading authentication...</p></div>; // Or a spinner
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
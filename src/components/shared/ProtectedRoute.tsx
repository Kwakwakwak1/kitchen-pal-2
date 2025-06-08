import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthAPI } from '../../providers/AuthProviderAPI';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { currentUser, isLoadingAuth } = useAuthAPI();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin access if required
  if (adminOnly) {
    const isAdmin = isAdminUser(currentUser.email);
    if (!isAdmin) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600">Admin privileges required to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

// Helper function to determine if user is admin
const isAdminUser = (email: string): boolean => {
  const adminEmails = ['admin@kitchen-pal.local', 'admin@kwakwakwak.com'];
  return adminEmails.includes(email) || email.endsWith('@kitchen-pal.admin');
};

export default ProtectedRoute;
export { isAdminUser };
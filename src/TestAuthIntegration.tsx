import React from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProviderAPI } from './providers/AuthProviderAPI';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Mock App State Provider for testing
const MockAppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockSetActiveView = (view: string) => {
    console.log('Setting active view:', view);
  };

  return (
    <div>
      {React.Children.map(children, child => 
        React.isValidElement(child) 
          ? React.cloneElement(child, { setActiveView: mockSetActiveView } as any)
          : child
      )}
    </div>
  );
};

// Simple test dashboard
const TestDashboard: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🎉 Authentication Successful!</h1>
      <p className="text-gray-600">You are now logged in with the API-based authentication system.</p>
      <button 
        onClick={() => window.location.hash = '/login'}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Test Logout (Go to Login)
      </button>
    </div>
  );
};

const TestAuthIntegration: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProviderAPI>
        <Router>
          <MockAppStateProvider>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/dashboard" element={<TestDashboard />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </MockAppStateProvider>
        </Router>
      </AuthProviderAPI>
    </QueryProvider>
  );
};

export default TestAuthIntegration;
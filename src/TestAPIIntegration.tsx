import React from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProviderAPI } from './providers/AuthProviderAPI';
import { StoresProviderAPI } from './providers/StoresProviderAPI';
import { ShoppingListsProviderAPI } from './providers/ShoppingListsProviderAPI';
import { RecipesProviderAPI } from './providers/RecipesProviderAPI';
import { InventoryProviderAPI } from './providers/InventoryProviderAPI';
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

// Test dashboard that shows data from all providers
const TestDashboard: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🎉 Full API Integration Test!</h1>
      <p className="text-gray-600 mb-4">All providers are now connected to the API backend.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-green-600">✅ Authentication</h3>
          <p className="text-sm text-gray-600">JWT-based auth with refresh tokens</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-blue-600">🏪 Stores</h3>
          <p className="text-sm text-gray-600">Store management via API</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-purple-600">🛒 Shopping Lists</h3>
          <p className="text-sm text-gray-600">Full shopping list management</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-orange-600">📱 Recipes</h3>
          <p className="text-sm text-gray-600">Recipe CRUD operations</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-red-600">📦 Inventory</h3>
          <p className="text-sm text-gray-600">Inventory management with validation</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-600">🔄 TanStack Query</h3>
          <p className="text-sm text-gray-600">State management & caching</p>
        </div>
      </div>
      
      <button 
        onClick={() => window.location.hash = '/login'}
        className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Test Logout (Go to Login)
      </button>
    </div>
  );
};

const TestAPIIntegration: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProviderAPI>
        <StoresProviderAPI>
          <ShoppingListsProviderAPI>
            <RecipesProviderAPI>
              <InventoryProviderAPI>
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
              </InventoryProviderAPI>
            </RecipesProviderAPI>
          </ShoppingListsProviderAPI>
        </StoresProviderAPI>
      </AuthProviderAPI>
    </QueryProvider>
  );
};

export default TestAPIIntegration;
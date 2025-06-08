import React, { useState } from 'react';
import { QueryProvider } from '../providers/QueryProvider';
import { useStores, useCreateStore, useShoppingLists, useCreateShoppingList } from '../hooks/useApi';
import { authService } from '../services';

const ApiTestContent: React.FC = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(authService.isAuthenticated());
  const [testResults, setTestResults] = useState<string[]>([]);

  // Use our API hooks
  const { data: stores, isLoading: storesLoading, error: storesError } = useStores();
  const { data: shoppingLists, isLoading: listsLoading, error: listsError } = useShoppingLists();
  const createStoreMutation = useCreateStore();
  const createListMutation = useCreateShoppingList();

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleLogin = async () => {
    try {
      const success = await authService.login({
        email: loginEmail,
        password: loginPassword,
      });
      
      if (success) {
        setIsLoggedIn(true);
        addTestResult('✅ Login successful!');
      } else {
        addTestResult('❌ Login failed');
      }
    } catch (error: any) {
      addTestResult(`❌ Login error: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsLoggedIn(false);
    addTestResult('✅ Logged out');
  };

  const testCreateStore = async () => {
    try {
      const newStore = await createStoreMutation.mutateAsync({
        name: `Test Store ${Date.now()}`,
        location: 'Test Location',
        website: 'https://example.com',
      });
      addTestResult(`✅ Created store: ${newStore.name}`);
    } catch (error: any) {
      addTestResult(`❌ Store creation failed: ${error.message}`);
    }
  };

  const testCreateShoppingList = async () => {
    try {
      const newList = await createListMutation.mutateAsync({
        name: `Test List ${Date.now()}`,
        is_active: true,
      });
      addTestResult(`✅ Created shopping list: ${newList.name}`);
    } catch (error: any) {
      addTestResult(`❌ Shopping list creation failed: ${error.message}`);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">API Test - Login Required</h2>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Login
          </button>
        </div>
        
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <div className="bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm mb-1">{result}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">API Integration Test</h2>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Stores Section */}
        <div className="border rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Stores API Test</h3>
          
          <button
            onClick={testCreateStore}
            disabled={createStoreMutation.isPending}
            className="mb-3 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {createStoreMutation.isPending ? 'Creating...' : 'Create Test Store'}
          </button>

          <div>
            <h4 className="font-medium mb-2">Current Stores:</h4>
            {storesLoading && <p>Loading stores...</p>}
            {storesError && <p className="text-red-500">Error: {storesError.message}</p>}
            {stores && (
              <div className="space-y-2">
                {stores.length === 0 ? (
                  <p className="text-gray-500">No stores found</p>
                ) : (
                  stores.map(store => (
                    <div key={store.id} className="bg-gray-100 p-2 rounded">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-sm text-gray-600">{store.location}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Shopping Lists Section */}
        <div className="border rounded p-4">
          <h3 className="text-lg font-semibold mb-3">Shopping Lists API Test</h3>
          
          <button
            onClick={testCreateShoppingList}
            disabled={createListMutation.isPending}
            className="mb-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {createListMutation.isPending ? 'Creating...' : 'Create Test List'}
          </button>

          <div>
            <h4 className="font-medium mb-2">Current Lists:</h4>
            {listsLoading && <p>Loading lists...</p>}
            {listsError && <p className="text-red-500">Error: {listsError.message}</p>}
            {shoppingLists && (
              <div className="space-y-2">
                {shoppingLists.length === 0 ? (
                  <p className="text-gray-500">No shopping lists found</p>
                ) : (
                  shoppingLists.map(list => (
                    <div key={list.id} className="bg-gray-100 p-2 rounded">
                      <div className="font-medium">{list.name}</div>
                      <div className="text-sm text-gray-600">
                        {list.is_active ? 'Active' : 'Inactive'} • {list.items_count || 0} items
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Test Results:</h3>
        <div className="bg-gray-100 p-4 rounded max-h-60 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No test results yet</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-sm mb-1 font-mono">{result}</div>
            ))
          )}
        </div>
        
        <button
          onClick={() => setTestResults([])}
          className="mt-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Results
        </button>
      </div>

      {/* API Status */}
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h3 className="text-lg font-semibold mb-2">API Status:</h3>
        <div className="text-sm space-y-1">
          <p>🌐 API URL: {import.meta.env.VITE_API_URL || 'http://localhost:3004'}</p>
          <p>🔑 Authenticated: {isLoggedIn ? '✅ Yes' : '❌ No'}</p>
          <p>📊 Stores Loaded: {stores ? `✅ ${stores.length} stores` : '⏳ Loading...'}</p>
          <p>🛒 Lists Loaded: {shoppingLists ? `✅ ${shoppingLists.length} lists` : '⏳ Loading...'}</p>
        </div>
      </div>
    </div>
  );
};

const ApiTestPage: React.FC = () => {
  return (
    <QueryProvider>
      <ApiTestContent />
    </QueryProvider>
  );
};

export default ApiTestPage;
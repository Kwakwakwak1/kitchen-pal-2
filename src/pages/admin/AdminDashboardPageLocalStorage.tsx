import React, { useState, useMemo } from 'react';
import { useAuth, useRecipes, useInventory, useShoppingLists, useStores } from '../../../App';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const AdminDashboardPageLocalStorage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'users' | 'export'>('dashboard');
  const { users: allUsers, currentUser } = useAuth();
  const { recipes } = useRecipes();
  const { inventory } = useInventory();
  const { shoppingLists } = useShoppingLists();
  const { stores } = useStores();

  // Check if current user is admin
  const isAdminUser = (email: string): boolean => {
    const adminEmails = ['admin@kitchen-pal.local', 'admin@kwakwakwak.com'];
    return adminEmails.includes(email) || email.endsWith('@kitchen-pal.admin');
  };

  if (!currentUser || !isAdminUser(currentUser.email)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">Admin privileges required to access this page.</p>
        </div>
      </div>
    );
  }

  const dashboardStats = useMemo(() => {
    const userCount = allUsers.length;
    const recipeCount = recipes.length;
    const inventoryCount = inventory.length;
    const shoppingListCount = shoppingLists.length;
    const storeCount = stores.length;

    const recentUsers = [...allUsers]
      .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime())
      .slice(0, 5)
      .map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        joinDate: user.id // Using ID as creation date approximation
      }));

    return {
      stats: {
        users: userCount,
        recipes: recipeCount,
        inventoryItems: inventoryCount,
        shoppingLists: shoppingListCount,
        stores: storeCount
      },
      recentUsers,
      systemHealth: {
        database: 'localStorage',
        uptime: 'N/A',
        memory: 'Browser Storage',
        timestamp: new Date().toISOString()
      }
    };
  }, [allUsers, recipes, inventory, shoppingLists, stores]);

  const formatUptime = (seconds: string) => {
    return seconds;
  };

  const formatMemory = (bytes: string) => {
    return bytes;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage users and system data (LocalStorage Mode)</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedTab('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedTab === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setSelectedTab('users')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedTab === 'users'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setSelectedTab('export')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedTab === 'export'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'dashboard' && (
          <div className="space-y-8">
            {/* System Stats */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {dashboardStats.stats.users}
                    </div>
                    <div className="text-gray-600 font-medium">Users</div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {dashboardStats.stats.recipes}
                    </div>
                    <div className="text-gray-600 font-medium">Recipes</div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {dashboardStats.stats.inventoryItems}
                    </div>
                    <div className="text-gray-600 font-medium">Inventory Items</div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {dashboardStats.stats.shoppingLists}
                    </div>
                    <div className="text-gray-600 font-medium">Shopping Lists</div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {dashboardStats.stats.stores}
                    </div>
                    <div className="text-gray-600 font-medium">Stores</div>
                  </div>
                </Card>
              </div>
            </div>

            {/* System Health */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health</h2>
              <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm text-gray-600">Storage Type</div>
                    <div className="font-medium text-green-600">
                      {dashboardStats.systemHealth.database}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Server Uptime</div>
                    <div className="font-medium text-gray-900">
                      {formatUptime(dashboardStats.systemHealth.uptime)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Storage Type</div>
                    <div className="font-medium text-gray-900">
                      {formatMemory(dashboardStats.systemHealth.memory)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Last Updated</div>
                    <div className="font-medium text-gray-900">
                      {new Date(dashboardStats.systemHealth.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Users */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Users</h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dashboardStats.recentUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {user.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {user.joinDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {selectedTab === 'users' && (
          <AdminUsersTab users={allUsers} />
        )}

        {selectedTab === 'export' && (
          <AdminExportTab 
            users={allUsers}
            recipes={recipes}
            inventory={inventory}
            shoppingLists={shoppingLists}
            stores={stores}
          />
        )}
      </div>
    </div>
  );
};

// Users Management Tab Component
const AdminUsersTab: React.FC<{ users: any[] }> = ({ users }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user => 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-sm">
                    {user.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// Export Data Tab Component
const AdminExportTab: React.FC<{ 
  users: any[], 
  recipes: any[], 
  inventory: any[], 
  shoppingLists: any[], 
  stores: any[] 
}> = ({ users, recipes, inventory, shoppingLists, stores }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'json' | 'csv', includeUserData: boolean) => {
    setIsExporting(true);
    
    try {
      let data: any;
      
      if (includeUserData) {
        data = {
          exportDate: new Date().toISOString(),
          users,
          recipes,
          inventory,
          shoppingLists,
          stores
        };
      } else {
        data = {
          exportDate: new Date().toISOString(),
          stats: {
            users: users.length,
            recipes: recipes.length,
            inventory: inventory.length,
            shoppingLists: shoppingLists.length,
            stores: stores.length
          }
        };
      }

      // Create and download file
      const blob = new Blob([
        format === 'json' ? JSON.stringify(data, null, 2) : convertToCSV(data)
      ], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kitchen-pal-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const convertToCSV = (data: any): string => {
    if (data.users) {
      return [
        'Name,Email,User ID',
        ...data.users.map((user: any) => `${user.name},${user.email},${user.id}`)
      ].join('\n');
    } else {
      return 'Metric,Count\nUsers,' + data.stats.users + '\nRecipes,' + data.stats.recipes + '\nInventory,' + data.stats.inventory + '\nShopping Lists,' + data.stats.shoppingLists + '\nStores,' + data.stats.stores;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Export System Data</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics Export</h3>
          <p className="text-gray-600 mb-4">
            Export system statistics and health information without user data.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => handleExport('json', false)}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? 'Exporting...' : 'Export Stats (JSON)'}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Full Data Export</h3>
          <p className="text-gray-600 mb-4">
            Export all system data including user information and content.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => handleExport('json', true)}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? 'Exporting...' : 'Export All Data (JSON)'}
            </Button>
            <Button
              onClick={() => handleExport('csv', true)}
              disabled={isExporting}
              variant="outline"
              className="w-full"
            >
              {isExporting ? 'Exporting...' : 'Export Users (CSV)'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPageLocalStorage;
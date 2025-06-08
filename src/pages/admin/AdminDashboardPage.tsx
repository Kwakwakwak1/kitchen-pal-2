import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const AdminDashboardPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'users' | 'export'>('dashboard');

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminService.getDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  if (isDashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage users and system data</p>
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
        {selectedTab === 'dashboard' && dashboardData && (
          <div className="space-y-8">
            {/* System Stats */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {dashboardData.stats.users}
                    </div>
                    <div className="text-gray-600 font-medium">Users</div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {dashboardData.stats.recipes}
                    </div>
                    <div className="text-gray-600 font-medium">Recipes</div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {dashboardData.stats.inventoryItems}
                    </div>
                    <div className="text-gray-600 font-medium">Inventory Items</div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {dashboardData.stats.shoppingLists}
                    </div>
                    <div className="text-gray-600 font-medium">Shopping Lists</div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {dashboardData.stats.stores}
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
                    <div className="text-sm text-gray-600">Database Status</div>
                    <div className={`font-medium ${
                      dashboardData.systemHealth.database === 'healthy' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {dashboardData.systemHealth.database}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Server Uptime</div>
                    <div className="font-medium text-gray-900">
                      {formatUptime(dashboardData.systemHealth.uptime)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Memory Usage</div>
                    <div className="font-medium text-gray-900">
                      {formatMemory(dashboardData.systemHealth.memory.rss)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600">Last Updated</div>
                    <div className="font-medium text-gray-900">
                      {new Date(dashboardData.systemHealth.timestamp).toLocaleTimeString()}
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
                      {dashboardData.recentUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {new Date(user.createdAt).toLocaleDateString()}
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
          <AdminUsersTab />
        )}

        {selectedTab === 'export' && (
          <AdminExportTab />
        )}
      </div>
    </div>
  );
};

// Users Management Tab Component
const AdminUsersTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', currentPage, searchTerm],
    queryFn: () => adminService.getAllUsers({
      page: currentPage,
      limit: 20,
      search: searchTerm
    }),
  });

  const { data: selectedUserData } = useQuery({
    queryKey: ['admin', 'user-details', selectedUser],
    queryFn: () => adminService.getUserDetails(selectedUser!),
    enabled: !!selectedUser,
  });

  const handleViewUser = (userId: string) => {
    setSelectedUser(userId);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await adminService.deleteUser(userToDelete.id);
      alert(`User ${userToDelete.name} deleted successfully`);
      setUserToDelete(null);
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      ) : usersData ? (
        <>
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
                      Data Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usersData.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user._count.recipes}R, {user._count.inventoryItems}I, {user._count.shoppingLists}S, {user._count.stores}St
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUser(user.id)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {usersData.pagination.pages > 1 && (
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-gray-600">
                Page {currentPage} of {usersData.pagination.pages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === usersData.pagination.pages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : null}

      {/* User Details Modal */}
      {selectedUser && selectedUserData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  User Details: {selectedUserData.user.firstName} {selectedUserData.user.lastName}
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="font-medium">Email:</span> {selectedUserData.user.email}</p>
                    <p><span className="font-medium">Joined:</span> {new Date(selectedUserData.user.createdAt).toLocaleDateString()}</p>
                    <p><span className="font-medium">Last Updated:</span> {new Date(selectedUserData.user.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Data Summary</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="font-medium">Recipes:</span> {selectedUserData.user._count.recipes}</p>
                    <p><span className="font-medium">Inventory Items:</span> {selectedUserData.user._count.inventoryItems}</p>
                    <p><span className="font-medium">Shopping Lists:</span> {selectedUserData.user._count.shoppingLists}</p>
                    <p><span className="font-medium">Stores:</span> {selectedUserData.user._count.stores}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recent Recipes</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedUserData.user.recipes.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUserData.user.recipes.map(recipe => (
                          <p key={recipe.id} className="text-sm">
                            {recipe.name} ({recipe._count.ingredients} ingredients) - {new Date(recipe.createdAt).toLocaleDateString()}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm">No recipes found</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recent Inventory Items</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedUserData.user.inventoryItems.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUserData.user.inventoryItems.map(item => (
                          <p key={item.id} className="text-sm">
                            {item.ingredientName} - {item.quantity} {item.unit} - {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm">No inventory items found</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete User
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{userToDelete.name}</strong>? 
              This will permanently delete the user and all their data (recipes, inventory, shopping lists, stores).
            </p>
            <div className="flex space-x-4">
              <Button
                onClick={confirmDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete User
              </Button>
              <Button
                onClick={() => setUserToDelete(null)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export Data Tab Component
const AdminExportTab: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'json' | 'csv', includeUserData: boolean) => {
    setIsExporting(true);
    try {
      const data = await adminService.exportSystemData({
        format,
        includeUserData
      });

      // Create and download file
      const blob = new Blob([
        format === 'json' ? JSON.stringify(data, null, 2) : data
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

export default AdminDashboardPage;
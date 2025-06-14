import React, { useState, useMemo } from 'react';
import { useInventory } from '../providers/InventoryProvider';
import { useRecipes } from '../providers/RecipesProvider';
import { useShoppingLists } from '../providers/ShoppingListsProvider';
import { useAppState } from '../providers/AppStateProvider';
import { useAuth } from '../providers/AuthProvider';
import { Button, Card, Alert } from '../components/ui';
import { SmartShoppingListGenerator } from '../components/shopping/SmartShoppingListGenerator';
import { 
  CalendarIcon, 
  ArchiveBoxIcon, 
  SparklesIcon, 
  ShoppingCartIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { 
  isItemExpiringSoon, 
  isItemExpired,
  isDiscreteUnit
} from '../../constants';
import { ShoppingListItem, FrequencyOfUse } from '../../types';

export const DashboardPage: React.FC = () => {
  const { inventory } = useInventory();
  const { recipes } = useRecipes();
  const { shoppingLists, addShoppingList } = useShoppingLists();
  const { setActiveView } = useAppState();
  const { currentUser } = useAuth();
  
  const [showSmartGenerator, setShowSmartGenerator] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Analytics calculations
  const analytics = useMemo(() => {
    const expiringSoonItems = inventory.filter(item => 
      isItemExpiringSoon(item.expirationDate, 7) && !isItemExpired(item.expirationDate)
    ).sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
    
    const expiredItems = inventory.filter(item => isItemExpired(item.expirationDate));
    
    const lowStockItems = inventory.filter(item => 
      item.lowStockThreshold && item.quantity < item.lowStockThreshold && !isItemExpired(item.expirationDate)
    );
    
    const toConsiderRestocking = inventory.filter(item => 
      item.frequencyOfUse && 
      item.frequencyOfUse !== FrequencyOfUse.OTHER && 
      !lowStockItems.find(lsi => lsi.id === item.id) && 
      !expiringSoonItems.find(esi => esi.id === item.id) && 
      !expiredItems.find(exi => exi.id === item.id)
    ).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

    const totalInventoryValue = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const activeShoppingLists = shoppingLists.filter(list => 
      list.items.some(item => !item.purchased)
    );
    
    const completedShoppingLists = shoppingLists.filter(list => 
      list.items.length > 0 && list.items.every(item => item.purchased)
    );

    // Recipe recommendations based on available ingredients
    const recipeRecommendations = recipes
      .map(recipe => {
        const availableIngredients = recipe.ingredients.filter(ingredient => {
          const inventoryItem = inventory.find(item => 
            item.ingredientName.toLowerCase() === ingredient.ingredientName.toLowerCase()
          );
          return inventoryItem && inventoryItem.quantity >= ingredient.quantity;
        });
        
        const completionPercentage = (availableIngredients.length / recipe.ingredients.length) * 100;
        const missingIngredients = recipe.ingredients.length - availableIngredients.length;
        
        return {
          recipe,
          completionPercentage,
          missingIngredients,
          canMake: completionPercentage === 100
        };
      })
      .sort((a, b) => b.completionPercentage - a.completionPercentage)
      .slice(0, 5);

    return {
      expiringSoonItems,
      expiredItems,
      lowStockItems,
      toConsiderRestocking,
      totalInventoryValue,
      activeShoppingLists,
      completedShoppingLists,
      recipeRecommendations,
      inventoryHealth: {
        total: inventory.length,
        healthy: inventory.length - expiredItems.length - expiringSoonItems.length - lowStockItems.length,
        needsAttention: expiredItems.length + expiringSoonItems.length + lowStockItems.length
      }
    };
  }, [inventory, recipes, shoppingLists]);

  const handleSmartGenerate = (items: ShoppingListItem[]) => {
    const newList = {
      name: `Smart List - ${new Date().toLocaleDateString()}`,
      items
    };

    addShoppingList(newList);
    setShowSmartGenerator(false);
    setAlertMessage({ 
      type: 'success', 
      message: `Smart shopping list created with ${items.length} items!` 
    });
  };

  const handleQuickAction = (action: string, data?: any) => {
    switch (action) {
      case 'addRecipe':
        setActiveView('recipe_detail', { mode: 'add' });
        break;
      case 'addInventory':
        setActiveView('inventory');
        break;
      case 'createShoppingList':
        setActiveView('shopping_list_detail', { mode: 'add' });
        break;
      case 'viewRecipe':
        setActiveView('recipe_detail', { id: data.id });
        break;
      case 'cookRecipe':
        setActiveView('recipe_detail', { id: data.id, mode: 'cooking' });
        break;
      case 'viewInventory':
        setActiveView('inventory');
        break;
      case 'viewShoppingLists':
        setActiveView('shopping_lists');
        break;
      default:
        break;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Please log in to view your dashboard</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {alertMessage && (
        <Alert 
          type={alertMessage.type} 
          message={alertMessage.message} 
          onClose={() => setAlertMessage(null)} 
        />
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {currentUser.name}!!!</h1>
        <p className="text-blue-100">
          Here's what's happening in your kitchen today
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Recipes</p>
              <p className="text-2xl font-bold text-gray-800">{recipes.length}</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inventory Items</p>
              <p className="text-2xl font-bold text-gray-800">{inventory.length}</p>
              <p className="text-xs text-gray-500">
                {analytics.inventoryHealth.healthy} healthy, {analytics.inventoryHealth.needsAttention} need attention
              </p>
            </div>
            <ArchiveBoxIcon className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Shopping Lists</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.activeShoppingLists.length}</p>
              <p className="text-xs text-gray-500">
                {analytics.completedShoppingLists.length} completed
              </p>
            </div>
            <ShoppingCartIcon className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready to Cook</p>
              <p className="text-2xl font-bold text-gray-800">
                {analytics.recipeRecommendations.filter(r => r.canMake).length}
              </p>
              <p className="text-xs text-gray-500">recipes available</p>
            </div>
            <PlayIcon className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            onClick={() => handleQuickAction('addRecipe')}
            variant="outline"
            className="h-20 flex-col"
          >
            <PlusIcon className="w-6 h-6 mb-2" />
            Add Recipe
          </Button>
          <Button
            onClick={() => handleQuickAction('addInventory')}
            variant="outline"
            className="h-20 flex-col"
          >
            <ArchiveBoxIcon className="w-6 h-6 mb-2" />
            Add Inventory
          </Button>
          <Button
            onClick={() => setShowSmartGenerator(true)}
            variant="outline"
            className="h-20 flex-col"
          >
            <SparklesIcon className="w-6 h-6 mb-2" />
            Smart Shopping
          </Button>
          <Button
            onClick={() => handleQuickAction('createShoppingList')}
            variant="outline"
            className="h-20 flex-col"
          >
            <ShoppingCartIcon className="w-6 h-6 mb-2" />
            New List
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Alerts */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory Alerts</h2>
          
          {analytics.expiredItems.length === 0 && 
           analytics.expiringSoonItems.length === 0 && 
           analytics.lowStockItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-green-600" />
              <p className="text-gray-600">All inventory items are in good condition!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Expired Items */}
              {analytics.expiredItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    <h3 className="font-medium text-red-800">
                      {analytics.expiredItems.length} Expired Item{analytics.expiredItems.length !== 1 ? 's' : ''}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {analytics.expiredItems.slice(0, 3).map(item => (
                      <p key={item.id} className="text-sm text-red-700">
                        {item.ingredientName} - expired {formatTimeAgo(item.expirationDate!)}
                      </p>
                    ))}
                    {analytics.expiredItems.length > 3 && (
                      <p className="text-sm text-red-600">
                        +{analytics.expiredItems.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Expiring Soon */}
              {analytics.expiringSoonItems.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ClockIcon className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-medium text-yellow-800">
                      {analytics.expiringSoonItems.length} Expiring Soon
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {analytics.expiringSoonItems.slice(0, 3).map(item => (
                      <p key={item.id} className="text-sm text-yellow-700">
                        {item.ingredientName} - expires {new Date(item.expirationDate!).toLocaleDateString()}
                      </p>
                    ))}
                    {analytics.expiringSoonItems.length > 3 && (
                      <p className="text-sm text-yellow-600">
                        +{analytics.expiringSoonItems.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Low Stock */}
              {analytics.lowStockItems.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowTrendingDownIcon className="w-5 h-5 text-orange-600" />
                    <h3 className="font-medium text-orange-800">
                      {analytics.lowStockItems.length} Low Stock Item{analytics.lowStockItems.length !== 1 ? 's' : ''}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {analytics.lowStockItems.slice(0, 3).map(item => (
                      <p key={item.id} className="text-sm text-orange-700">
                        {item.ingredientName} - {isDiscreteUnit(item.unit) 
                          ? Math.round(item.quantity) 
                          : item.quantity.toFixed(1)
                        } {item.unit} left
                      </p>
                    ))}
                    {analytics.lowStockItems.length > 3 && (
                      <p className="text-sm text-orange-600">
                        +{analytics.lowStockItems.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={() => handleQuickAction('viewInventory')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                View All Inventory
              </Button>
            </div>
          )}
        </Card>

        {/* Recipe Recommendations */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recipe Recommendations</h2>
          
          {analytics.recipeRecommendations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Add some recipes to get personalized recommendations!</p>
              <Button
                onClick={() => handleQuickAction('addRecipe')}
                variant="primary"
                size="sm"
                className="mt-3"
              >
                Add Your First Recipe
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.recipeRecommendations.map(({ recipe, completionPercentage, missingIngredients, canMake }) => (
                <div
                  key={recipe.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    canMake 
                      ? 'bg-green-50 border-green-200' 
                      : completionPercentage >= 75
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-800">{recipe.name}</h3>
                    {canMake && (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            canMake ? 'bg-green-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 ml-3">
                      {Math.round(completionPercentage)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {canMake 
                        ? 'Ready to cook!' 
                        : `Missing ${missingIngredients} ingredient${missingIngredients !== 1 ? 's' : ''}`
                      }
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleQuickAction('viewRecipe', recipe)}
                        variant="outline"
                        size="sm"
                      >
                        View
                      </Button>
                      {canMake && (
                        <Button
                          onClick={() => handleQuickAction('cookRecipe', recipe)}
                          variant="primary"
                          size="sm"
                        >
                          Cook
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
        
        {shoppingLists.length === 0 && recipes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No recent activity. Start by adding a recipe or creating a shopping list!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Recent Shopping Lists */}
            {analytics.activeShoppingLists.slice(0, 3).map(list => (
              <div key={list.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <ShoppingCartIcon className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-800">{list.name}</p>
                    <p className="text-sm text-gray-600">
                      {list.items.filter(item => !item.purchased).length} items remaining
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleQuickAction('viewShoppingLists')}
                  variant="outline"
                  size="sm"
                >
                  View
                </Button>
              </div>
            ))}

            {/* Recent Recipes */}
            {recipes.slice(0, 2).map(recipe => (
              <div key={recipe.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-800">{recipe.name}</p>
                    <p className="text-sm text-gray-600">
                      {recipe.ingredients.length} ingredients • Serves {recipe.defaultServings}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleQuickAction('viewRecipe', recipe)}
                  variant="outline"
                  size="sm"
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Smart Shopping List Generator Modal */}
      {showSmartGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <SmartShoppingListGenerator
                onClose={() => setShowSmartGenerator(false)}
                onGenerate={handleSmartGenerate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage; 
import React, { useState } from 'react';
import { useInventory } from '../../providers/InventoryProviderAPI';
import { useShoppingLists } from '../../providers/ShoppingListsProviderAPI';
import { useAppState } from '../../providers/AppStateProvider';
import { useAuth } from '../../providers/AuthProviderAPI';
import { 
  generateId, 
  isItemExpiringSoon, 
  isItemExpired, 
  isDiscreteUnit,
  CalendarIcon,
  ArchiveBoxIcon,
  SparklesIcon,
  ShoppingCartIcon
} from '../../../constants';
import { Alert, Card, Button } from '../../../components';
import { InventoryItem, ShoppingListItem, FrequencyOfUse } from '../../../types';

const DashboardPage: React.FC = () => {
  const { inventory } = useInventory();
  const { addShoppingList } = useShoppingLists();
  const { setActiveView } = useAppState();
  const { currentUser } = useAuth();
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const expiringSoonItems = inventory.filter(item => isItemExpiringSoon(item.expirationDate, 7) && !isItemExpired(item.expirationDate)).sort((a,b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
  const expiredItems = inventory.filter(item => isItemExpired(item.expirationDate));
  const lowStockItems = inventory.filter(item => item.lowStockThreshold && item.quantity < item.lowStockThreshold && !isItemExpired(item.expirationDate));
  const toConsiderRestocking = inventory.filter(item => item.frequencyOfUse && item.frequencyOfUse !== FrequencyOfUse.OTHER && !lowStockItems.find(lsi => lsi.id === item.id) && !expiringSoonItems.find(esi => esi.id === item.id) && !expiredItems.find(exi => exi.id === item.id)).sort((a,b) => a.ingredientName.localeCompare(b.ingredientName));

  // Helper function to calculate restock quantity
  const calculateRestockQuantity = (item: InventoryItem): number => {
    const threshold = item.lowStockThreshold!;
    const current = item.quantity;
    const buffer = Math.ceil(threshold * 0.2); // 20% buffer
    const needed = (threshold - current) + buffer;
    
    // Round up to practical quantities
    return Math.max(1, Math.ceil(needed));
  };

  // Function to create low stock shopping list
  const createLowStockShoppingList = () => {
    if (lowStockItems.length === 0) {
      setAlertMessage({
        type: 'error',
        message: 'No low stock items found to create a shopping list.'
      });
      setTimeout(() => setAlertMessage(null), 3000);
      return;
    }
    
    const shoppingListItems: ShoppingListItem[] = lowStockItems.map(item => {
      const neededQuantity = calculateRestockQuantity(item);
      
      return {
        id: generateId(),
        ingredientName: item.ingredientName,
        neededQuantity,
        unit: item.unit,
        recipeSources: [], // No recipe source for restocking
        purchased: false,
        storeId: item.defaultStoreId
      };
    });
    
    const listName = `Low Stock Restocking - ${new Date().toLocaleDateString()}`;
    const newListId = addShoppingList({
      name: listName,
      items: shoppingListItems
    });
    
    // Show success message
    setAlertMessage({
      type: 'success',
      message: `Restocking shopping list created with ${shoppingListItems.length} items!`
    });
    setTimeout(() => setAlertMessage(null), 5000);
    
    // Navigate to the new shopping list
    setActiveView('shopping_list_detail', { id: newListId });
  };

  const renderInventoryItem = (item: InventoryItem, context: 'expiring' | 'low' | 'expired' | 'restock') => (
    <li key={`${context}-${item.id}`} className="p-3 bg-white rounded-md shadow-sm flex justify-between items-center">
        <div>
            <span className="font-medium text-gray-800">{item.ingredientName}</span>
            <span className="text-sm text-gray-600 ml-2">
              ({isDiscreteUnit(item.unit) 
                ? `${Math.round(item.quantity)} ${item.unit}`
                : `${item.quantity.toFixed(1)} ${item.unit}`
              })
            </span>
            {context === 'expiring' && item.expirationDate && <span className="text-xs text-yellow-600 ml-2">Expires: {new Date(item.expirationDate).toLocaleDateString()}</span>}
            {context === 'expired' && item.expirationDate && <span className="text-xs text-red-700 ml-2">Expired: {new Date(item.expirationDate).toLocaleDateString()}</span>}
            {context === 'low' && item.lowStockThreshold && <span className="text-xs text-red-600 ml-2">Low Stock! (Threshold: {item.lowStockThreshold})</span>}
            {context === 'restock' && item.frequencyOfUse && <span className="text-xs text-blue-600 ml-2">Use: {item.frequencyOfUse}</span>}
        </div>
    </li>
  );

  return (
    <div className="container mx-auto p-4 space-y-8">
        {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />}
        <h1 className="text-3xl font-bold text-gray-800">Welcome, {currentUser?.name}!</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <h2 className="text-xl font-semibold text-red-700 mb-3 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-red-700"/> Expired Items ({expiredItems.length})</h2>
                {expiredItems.length > 0 ? <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">{expiredItems.map(item => renderInventoryItem(item, 'expired'))}</ul> : <p className="text-sm text-gray-500">No items currently expired. Great job!</p>}
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-yellow-600 mb-3 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-yellow-600"/> Expiring Soon ({expiringSoonItems.length})</h2>
                {expiringSoonItems.length > 0 ? <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">{expiringSoonItems.map(item => renderInventoryItem(item, 'expiring'))}</ul> : <p className="text-sm text-gray-500">No items expiring in the next 7 days.</p>}
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-red-600 mb-3 flex items-center"><ArchiveBoxIcon className="w-5 h-5 mr-2 text-red-600"/>Low Stock Items ({lowStockItems.length})</h2>
                
                {lowStockItems.length > 0 && (
                  <>
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-4">
                      {lowStockItems.map(item => renderInventoryItem(item, 'low'))}
                    </ul>
                    
                    <Button
                      onClick={createLowStockShoppingList}
                      variant="primary"
                      size="sm"
                      leftIcon={<ShoppingCartIcon className="w-4 h-4" />}
                      className="w-full"
                    >
                      Create Restocking Shopping List
                    </Button>
                  </>
                )}
                
                {lowStockItems.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No items are currently low on stock based on thresholds.
                  </p>
                )}
            </Card>
        </div>
         <Card>
            <h2 className="text-xl font-semibold text-blue-600 mb-3 flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-600"/>Consider Re-stocking ({toConsiderRestocking.length})</h2>
            {toConsiderRestocking.length > 0 ? <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">{toConsiderRestocking.map(item => renderInventoryItem(item, 'restock'))}</ul> : <p className="text-sm text-gray-500">No specific items flagged for re-stocking based on frequency. Check your inventory!</p>}
        </Card>
    </div>
  );
};

export default DashboardPage; 
import React, { useState } from 'react';
import { 
  useShoppingLists, 
  useInventory, 
  useStores, 
  useAppState 
} from '../../App';
import { 
  ShoppingListItem, 
  InventoryItem 
} from '../../types';
import { 
  Button, 
  CheckboxField, 
  SelectField, 
  EmptyState, 
  Alert 
} from '../../components';
import { 
  generateId, 
  normalizeIngredientName, 
  isItemExpiringSoon, 
  isItemExpired 
} from '../../constants';
import {
  ArrowLeftIcon,
  ShoppingCartIcon,
  SparklesIcon,
  PlusIcon
} from '../../constants';

export const ShoppingListDetailPage: React.FC = () => {
  const { getShoppingListById, updateShoppingList } = useShoppingLists();
  const { inventory, addInventoryItem: addInvItemSystem } = useInventory(); // Renamed to avoid conflict
  const { stores, getStoreById } = useStores();
  const { setActiveView, viewParams } = useAppState();
  const listId = viewParams.id || '';
  const shoppingList = getShoppingListById(listId);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  if (!shoppingList) { 
    return (
      <div className="container mx-auto p-4 text-center">
        <EmptyState
            icon={<ShoppingCartIcon />}
            title="Shopping List Not Found"
            message="The shopping list you are looking for does not exist or may have been removed."
            actionButton={<Button onClick={() => setActiveView('shopping_lists')} variant="primary">Back to Shopping Lists</Button>}
        />
      </div>
    );
  }

  const shoppingListItemNames = shoppingList.items.map(item => normalizeIngredientName(item.ingredientName));

  const suggestedLowStockItems = inventory.filter(invItem => 
    invItem.lowStockThreshold && invItem.quantity < invItem.lowStockThreshold &&
    !shoppingListItemNames.includes(normalizeIngredientName(invItem.ingredientName))
  );

  const suggestedExpiringItems = inventory.filter(invItem =>
    isItemExpiringSoon(invItem.expirationDate) && !isItemExpired(invItem.expirationDate) &&
    !shoppingListItemNames.includes(normalizeIngredientName(invItem.ingredientName))
  );

  const handleAddSuggestedItem = (invItem: InventoryItem, type: 'low-stock' | 'expiring') => {
    if (!shoppingList) return;

    let quantityToAdd = 1;
    if (type === 'low-stock' && invItem.lowStockThreshold) {
      quantityToAdd = Math.max(1, invItem.lowStockThreshold - invItem.quantity);
    }

    const newShoppingListItem: ShoppingListItem = {
      id: generateId(),
      ingredientName: invItem.ingredientName,
      neededQuantity: quantityToAdd,
      unit: invItem.unit,
      recipeSources: [], // No recipe source for suggested items
      purchased: false,
      storeId: invItem.defaultStoreId,
    };

    const updatedItems = [...shoppingList.items, newShoppingListItem];
    updateShoppingList({ ...shoppingList, items: updatedItems });
    setAlertMessage(`${invItem.ingredientName} added to the shopping list.`);
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const toggleItemPurchased = (itemId: string, currentlyPurchased: boolean) => {
    let itemAddedToInventory = false;
    const updatedItems = shoppingList.items.map(item => {
      if (item.id === itemId) {
        const newPurchasedState = !currentlyPurchased;
        if (newPurchasedState) { 
          addInvItemSystem({ 
            ingredientName: item.ingredientName, 
            quantity: item.neededQuantity, 
            unit: item.unit,
            // For items purchased from SL, we don't know exp date/freq/store unless it was pre-filled
            // This info is best updated in inventory directly.
            // defaultStoreId: item.storeId 
          }, true); 
          itemAddedToInventory = true;
        }
        return { ...item, purchased: newPurchasedState };
      }
      return item;
    });
    updateShoppingList({ ...shoppingList, items: updatedItems });
    if(itemAddedToInventory) {
        const changedItem = shoppingList.items.find(i => i.id === itemId);
        setAlertMessage(`${changedItem?.ingredientName} marked as purchased and added to inventory.`);
        setTimeout(() => setAlertMessage(null), 3000);
    }
  };
  
  const handleStoreChange = (itemId: string, storeId: string) => {
    const updatedItems = shoppingList.items.map(item =>
      item.id === itemId ? { ...item, storeId: storeId === "NONE" ? undefined : storeId } : item
    );
    updateShoppingList({ ...shoppingList, items: updatedItems });
  };

  const addAllPurchasedToInventory = () => {
    let itemsAddedCount = 0;
    const updatedItems = shoppingList.items.map(item => {
      if (!item.purchased) {
         addInvItemSystem({
            ingredientName: item.ingredientName,
            quantity: item.neededQuantity,
            unit: item.unit
         }, true);
         itemsAddedCount++;
         return {...item, purchased: true};
      }
      return item;
    });
    updateShoppingList({ ...shoppingList, items: updatedItems });
    setAlertMessage(`${itemsAddedCount} item(s) marked as purchased and added to inventory! Redirecting to recipes...`);
    
    // Navigate to recipes page after brief delay to show updated inventory status
    setTimeout(() => {
      setActiveView('recipes');
    }, 2000);
  };
  
  const itemsByStore: Record<string, ShoppingListItem[]> = shoppingList.items.reduce((acc, item) => {
    const storeKey = item.storeId || 'unassigned';
    if (!acc[storeKey]) acc[storeKey] = [];
    acc[storeKey].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

  const storeOptions = [{value: "NONE", label: "No Specific Store"}, ...stores.map(s => ({ value: s.id, label: s.name }))];

  const renderSuggestedItem = (item: InventoryItem, type: 'low-stock' | 'expiring') => (
    <li key={`suggest-${item.id}`} className="p-3 bg-gray-50 rounded-md shadow-sm flex justify-between items-center">
      <div>
        <span className="font-medium text-gray-700">{item.ingredientName}</span>
        <span className="text-sm text-gray-500 ml-2">({item.quantity.toFixed(1)} {item.unit} in stock)</span>
        {type === 'expiring' && item.expirationDate && <span className="text-xs text-yellow-600 ml-2">Expires: {new Date(item.expirationDate).toLocaleDateString()}</span>}
        {type === 'low-stock' && item.lowStockThreshold && <span className="text-xs text-red-600 ml-2">Low! (Threshold: {item.lowStockThreshold})</span>}
      </div>
      <Button size="sm" variant="secondary" onClick={() => handleAddSuggestedItem(item, type)} leftIcon={<PlusIcon className="w-4 h-4"/>}>
        Add to List
      </Button>
    </li>
  );

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => setActiveView('shopping_lists')} variant="ghost" leftIcon={<ArrowLeftIcon />} className="mb-6">Back to Shopping Lists</Button>
      {alertMessage && <Alert type="success" message={alertMessage} onClose={() => setAlertMessage(null)} />}
      <h2 className="text-3xl font-bold text-gray-800 mb-2">{shoppingList.name}</h2>
      <p className="text-sm text-gray-500 mb-6">Created: {new Date(shoppingList.createdAt).toLocaleDateString()}</p>
      
      {Object.entries(itemsByStore).map(([storeId, items]) => {
        const store = getStoreById(storeId);
        const storeName = store ? store.name : "Unassigned Items";
        return (
          <div key={storeId} className="mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">{storeName}</h3>
            <ul className="space-y-3">
            {items.map(item => (
              <li key={item.id} className={`p-4 rounded-lg shadow flex items-center justify-between ${item.purchased ? 'bg-green-50 opacity-70' : 'bg-white'}`}>
                <div className="flex items-center flex-grow">
                  <CheckboxField
                    id={`item-${item.id}`}
                    checked={item.purchased}
                    onChange={() => toggleItemPurchased(item.id, item.purchased)}
                    label={
                      <div>
                        <span className={`font-medium ${item.purchased ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                          {item.ingredientName}
                        </span>
                        <span className={`ml-2 text-sm ${item.purchased ? 'text-gray-400' : 'text-gray-600'}`}>
                          ({item.neededQuantity} {item.unit})
                        </span>
                        {item.recipeSources.length > 0 && (
                          <p className="text-xs text-gray-500">
                            For: {item.recipeSources.map(rs => `${rs.recipeName} (${rs.quantity.toFixed(1)}${item.unit})`).join(', ')}
                          </p>
                        )}
                      </div>
                    }
                    containerClassName="w-full"
                  />
                </div>
                <div className="w-48 ml-4 flex-shrink-0">
                    <SelectField 
                        label=""
                        options={storeOptions}
                        value={item.storeId || "NONE"}
                        onChange={(e) => handleStoreChange(item.id, e.target.value)}
                        className="text-xs p-1.5"
                        aria-label={`Store for ${item.ingredientName}`}
                    />
                </div>
              </li>
            ))}
            </ul>
          </div>
        );
      })}
      
      {shoppingList.items.length === 0 && (
        <EmptyState
            icon={<ShoppingCartIcon/>}
            title="This Shopping List is Empty"
            message="No items in this list. You can generate items from recipes or add them manually."
        />
      )}

      {shoppingList.items.some(item => !item.purchased) && (
        <div className="mt-8 text-right">
          <Button onClick={addAllPurchasedToInventory} variant="primary" size="lg">
            Mark All Purchased & Add to Inventory
          </Button>
        </div>
      )}

      {/* Suggested Add-Ons Section */}
      {(suggestedLowStockItems.length > 0 || suggestedExpiringItems.length > 0) && (
        <div className="mt-12 p-6 bg-gray-50 rounded-lg shadow">
          <h3 className="text-2xl font-semibold text-gray-700 mb-6 flex items-center">
            <SparklesIcon className="w-6 h-6 mr-2 text-blue-500" /> Suggested Add-Ons
          </h3>
          
          {suggestedLowStockItems.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-red-600 mb-3">Low on Stock</h4>
              <ul className="space-y-2">
                {suggestedLowStockItems.map(item => renderSuggestedItem(item, 'low-stock'))}
              </ul>
            </div>
          )}

          {suggestedExpiringItems.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-yellow-600 mb-3">Expiring Soon</h4>
              <ul className="space-y-2">
                {suggestedExpiringItems.map(item => renderSuggestedItem(item, 'expiring'))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 
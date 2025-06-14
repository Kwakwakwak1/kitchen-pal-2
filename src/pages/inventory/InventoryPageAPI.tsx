import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../../../types';
import { useInventory } from '../../providers/InventoryProviderAPI';
import { useAppState } from '../../providers/AppStateProvider';
import { isItemExpiringSoon, isItemExpired, isDiscreteUnit } from '../../../constants';
import { ArchiveBoxIcon, PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon, XMarkIcon } from '../../../constants';
import { Modal, Button, Card, EmptyState, BottomActionBar, ConfirmationModal } from '../../../components';
import InventoryItemFormAPI from './InventoryItemFormAPI';
import { inventoryService } from '../../services/inventoryService';

const InventoryPageAPI: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  const { searchTerm, setSearchTerm } = useAppState(); 
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [selectedItemsInStock, setSelectedItemsInStock] = useState<Set<string>>(new Set());
  const [selectedItemsEmpty, setSelectedItemsEmpty] = useState<Set<string>>(new Set());
  const [isSelectModeInStock, setIsSelectModeInStock] = useState(false);
  const [isSelectModeEmpty, setIsSelectModeEmpty] = useState(false);
  const [activeSection, setActiveSection] = useState<'inStock' | 'empty'>('inStock');
  
  // Confirmation modals
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = (itemData: Omit<InventoryItem, 'id'> | InventoryItem) => {
    if ('id' in itemData) {
      updateInventoryItem(itemData);
    } else {
      addInventoryItem(itemData); 
    }
    setShowModal(false);
    setEditingItem(undefined);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  // Separate items into in-stock and empty
  const { inStockItems, emptyItems } = useMemo(() => {
    const filtered = inventory.filter(item =>
      item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const inStock = filtered.filter(item => item.quantity > 0)
      .sort((a,b) => {
        if (a.expirationDate && b.expirationDate) return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        if (a.expirationDate) return -1;
        if (b.expirationDate) return 1;
        return a.ingredientName.localeCompare(b.ingredientName);
      });

    const empty = filtered.filter(item => item.quantity === 0)
      .sort((a,b) => a.ingredientName.localeCompare(b.ingredientName));

    return { inStockItems: inStock, emptyItems: empty };
  }, [inventory, searchTerm]);

  // In Stock section handlers
  const toggleSelectModeInStock = () => {
    setIsSelectModeInStock(!isSelectModeInStock);
    if (isSelectModeInStock) {
      setSelectedItemsInStock(new Set());
    }
  };

  const toggleSelectItemInStock = (itemId: string) => {
    const newSelected = new Set(selectedItemsInStock);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItemsInStock(newSelected);
  };

  const selectAllInStock = () => {
    setSelectedItemsInStock(new Set(inStockItems.map(item => item.id)));
  };

  const clearSelectionInStock = () => {
    setSelectedItemsInStock(new Set());
  };

  // Empty section handlers
  const toggleSelectModeEmpty = () => {
    setIsSelectModeEmpty(!isSelectModeEmpty);
    if (isSelectModeEmpty) {
      setSelectedItemsEmpty(new Set());
    }
  };

  const toggleSelectItemEmpty = (itemId: string) => {
    const newSelected = new Set(selectedItemsEmpty);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItemsEmpty(newSelected);
  };

  const selectAllEmpty = () => {
    setSelectedItemsEmpty(new Set(emptyItems.map(item => item.id)));
  };

  const clearSelectionEmpty = () => {
    setSelectedItemsEmpty(new Set());
  };

  // Actions
  const handleEmptyItems = async () => {
    if (selectedItemsInStock.size === 0) return;
    
    setIsProcessing(true);
    try {
      const idsToEmpty = Array.from(selectedItemsInStock);
      await inventoryService.batchEmptyInventoryItems(idsToEmpty);
      
      // Update local state by setting quantities to 0
      idsToEmpty.forEach(id => {
        const item = inventory.find(item => item.id === id);
        if (item) {
          updateInventoryItem({ ...item, quantity: 0 });
        }
      });
      
      setSelectedItemsInStock(new Set());
      setIsSelectModeInStock(false);
      setShowEmptyConfirm(false);
    } catch (error) {
      console.error('Error emptying items:', error);
      alert('Failed to empty some items. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItems = async () => {
    if (selectedItemsEmpty.size === 0) return;
    
    setIsProcessing(true);
    try {
      const idsToDelete = Array.from(selectedItemsEmpty);
      await inventoryService.batchDeleteInventoryItems(idsToDelete);
      
      // Remove items from inventory state
      idsToDelete.forEach(id => deleteInventoryItem(id));
      
      setSelectedItemsEmpty(new Set());
      setIsSelectModeEmpty(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting items:', error);
      alert('Failed to delete some items. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderItemCard = (item: InventoryItem, isInStockSection: boolean) => {
    const expiringSoon = isItemExpiringSoon(item.expirationDate);
    const expired = isItemExpired(item.expirationDate);
    const lowStock = item.lowStockThreshold && item.quantity < item.lowStockThreshold;
    
    let cardBorder = '';
    if (expired) cardBorder = 'border-2 border-red-700 bg-red-50';
    else if (expiringSoon) cardBorder = 'border-2 border-yellow-500 bg-yellow-50';
    else if (lowStock) cardBorder = 'border-2 border-red-500';

    const isSelected = isInStockSection 
      ? selectedItemsInStock.has(item.id)
      : selectedItemsEmpty.has(item.id);
    
    const isSelectMode = isInStockSection ? isSelectModeInStock : isSelectModeEmpty;
    
    const toggleSelect = isInStockSection ? toggleSelectItemInStock : toggleSelectItemEmpty;

    return (
      <Card key={item.id} className={`relative ${cardBorder} ${item.quantity === 0 ? 'opacity-75' : ''}`}>
        {/* Selection checkbox */}
        {isSelectMode && (
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(item.id)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        )}
        
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{item.ingredientName}</h3>
            <p className={`text-gray-600 ${item.quantity === 0 ? 'text-red-600 font-medium' : ''}`}>
              {item.quantity === 0 ? 'Out of stock' : 
                isDiscreteUnit(item.unit) 
                  ? `${Math.round(item.quantity)} ${item.unit}`
                  : `${item.quantity.toFixed(2)} ${item.unit}`
              }
            </p>
            {item.expirationDate && <p className={`text-xs ${expired || expiringSoon ? 'font-semibold' : ''} ${expired ? 'text-red-700' : expiringSoon ? 'text-yellow-700' : 'text-gray-500'}`}>Exp: {new Date(item.expirationDate).toLocaleDateString()} {expired && "(Expired!)"}{!expired && expiringSoon && "(Expiring Soon!)"}</p>}
            {lowStock && !expired && !expiringSoon && item.quantity > 0 && <span className="text-xs text-red-600 font-semibold">Low Stock!</span>}
            {item.frequencyOfUse && <p className="text-xs text-gray-500">Use: {item.frequencyOfUse}</p>}
          </div>
          <div className="flex flex-col space-y-1">
            <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="p-1.5">
              <PencilIcon className="w-4 h-4"/>
            </Button>
            <Button variant="danger" size="sm" onClick={() => deleteInventoryItem(item.id)} className="p-1.5">
              <TrashIcon className="w-4 h-4"/>
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 pb-24">
      {/* Section Toggle */}
      <div className="mb-6 flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSection('inStock')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'inStock'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            In Stock ({inStockItems.length})
          </button>
          <button
            onClick={() => setActiveSection('empty')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'empty'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Empty ({emptyItems.length})
          </button>
        </div>
      </div>

      {/* In Stock Section */}
      {activeSection === 'inStock' && (
        <>
          {/* In Stock Toolbar */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant={isSelectModeInStock ? "primary" : "ghost"} 
                onClick={toggleSelectModeInStock}
              >
                {isSelectModeInStock ? 'Exit Select Mode' : 'Select Items'}
              </Button>
              
              {isSelectModeInStock && (
                <>
                  <Button variant="ghost" onClick={selectAllInStock}>
                    Select All ({inStockItems.length})
                  </Button>
                  <Button variant="ghost" onClick={clearSelectionInStock}>
                    Clear Selection
                  </Button>
                </>
              )}
            </div>
            
            {isSelectModeInStock && selectedItemsInStock.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-600">
                  {selectedItemsInStock.size} item{selectedItemsInStock.size !== 1 ? 's' : ''} selected
                </span>
                <Button 
                  variant="primary" 
                  onClick={() => setShowEmptyConfirm(true)}
                                     leftIcon={<XMarkIcon className="w-4 h-4" />}
                >
                  Mark as Empty ({selectedItemsInStock.size})
                </Button>
              </div>
            )}
          </div>

          {/* In Stock Items */}
          {inStockItems.length === 0 && searchTerm === '' ? (
            <EmptyState 
              icon={<ArchiveBoxIcon />}
              title="No Items In Stock"
              message="Add items to your inventory or check the Empty section for items that need restocking."
              actionButton={<Button onClick={() => { setEditingItem(undefined); setShowModal(true); }} leftIcon={<PlusIcon/>}>Add New Item</Button>}
            />
          ) : inStockItems.length === 0 && searchTerm !== '' ? (
            <EmptyState 
              icon={<MagnifyingGlassIcon />}
              title="No Items Found"
              message={`Your search for "${searchTerm}" did not match any items in stock.`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inStockItems.map(item => renderItemCard(item, true))}
            </div>
          )}
        </>
      )}

      {/* Empty Section */}
      {activeSection === 'empty' && (
        <>
          {/* Empty Items Toolbar */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant={isSelectModeEmpty ? "primary" : "ghost"} 
                onClick={toggleSelectModeEmpty}
              >
                {isSelectModeEmpty ? 'Exit Select Mode' : 'Select Items'}
              </Button>
              
              {isSelectModeEmpty && (
                <>
                  <Button variant="ghost" onClick={selectAllEmpty}>
                    Select All ({emptyItems.length})
                  </Button>
                  <Button variant="ghost" onClick={clearSelectionEmpty}>
                    Clear Selection
                  </Button>
                </>
              )}
            </div>
            
            {isSelectModeEmpty && selectedItemsEmpty.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-600">
                  {selectedItemsEmpty.size} item{selectedItemsEmpty.size !== 1 ? 's' : ''} selected
                </span>
                <Button 
                  variant="danger" 
                  onClick={() => setShowDeleteConfirm(true)}
                  leftIcon={<TrashIcon className="w-4 h-4" />}
                >
                  Delete Selected ({selectedItemsEmpty.size})
                </Button>
              </div>
            )}
          </div>

          {/* Empty Items */}
          {emptyItems.length === 0 && searchTerm === '' ? (
            <EmptyState 
              icon={<ArchiveBoxIcon />}
              title="No Empty Items"
              message="Items that run out will appear here so you can maintain your preferences and shopping lists."
            />
          ) : emptyItems.length === 0 && searchTerm !== '' ? (
            <EmptyState 
              icon={<MagnifyingGlassIcon />}
              title="No Items Found"
              message={`Your search for "${searchTerm}" did not match any empty items.`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emptyItems.map(item => renderItemCard(item, false))}
            </div>
          )}
        </>
      )}

      
      {/* Bottom Action Bar with Search and Add Item */}
      <BottomActionBar
        searchValue={searchTerm || ''}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search inventory..."
        actionButton={
          <Button 
            onClick={() => { setEditingItem(undefined); setShowModal(true); }} 
            leftIcon={<PlusIcon />}
            className="rounded-full"
          >
            Add Item
          </Button>
        }
      />
      
      {/* Form Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(undefined); }} title={editingItem ? "Edit Inventory Item" : "Add Inventory Item"} size="lg">
        <InventoryItemFormAPI initialItem={editingItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditingItem(undefined); }} />
      </Modal>

      {/* Empty Confirmation Modal */}
      <ConfirmationModal
        isOpen={showEmptyConfirm}
        onClose={() => setShowEmptyConfirm(false)}
        onConfirm={handleEmptyItems}
        title="Mark Items as Empty"
        message={`Are you sure you want to mark ${selectedItemsInStock.size} item${selectedItemsInStock.size !== 1 ? 's' : ''} as empty? This will set their quantity to 0 but keep all your preferences (store, brand, etc.).`}
        confirmText="Yes, Mark as Empty"
        variant="warning"
        isLoading={isProcessing}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteItems}
        title="Permanently Delete Items"
        message={`Are you sure you want to permanently delete ${selectedItemsEmpty.size} item${selectedItemsEmpty.size !== 1 ? 's' : ''}? This will remove the item${selectedItemsEmpty.size !== 1 ? 's' : ''} and all associated preferences from your inventory. This action cannot be undone.`}
        confirmText="Yes, Delete Permanently"
        cancelText="Cancel"
        variant="danger"
        isLoading={isProcessing}
      />
    </div>
  );
};

export default InventoryPageAPI; 
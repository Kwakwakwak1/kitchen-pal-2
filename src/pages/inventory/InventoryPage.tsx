import React, { useState, useMemo } from 'react';
import { EnhancedInventoryItem, ItemCategory } from '../../../types'; // ItemCategory might be needed for typing
import { useInventory, useAppState, useCategories } from '../../../App'; // useCategories added
// Removed isItemExpiringSoon, isItemExpired, isDiscreteUnit as they are handled in ItemTableRow
import { ArchiveBoxIcon, PlusIcon, MagnifyingGlassIcon, CubeTransparentIcon } from '../../../constants'; // Adjusted icons
import { Modal, Button, EmptyState, AddItemButton } from '../../../components'; // Card removed as CategorySection handles it
import InventoryItemForm from './InventoryItemForm';
import CategorySection from '../../components/inventory/CategorySection'; // Added CategorySection

const InventoryPage: React.FC = () => {
  // Hooks for inventory, app state, and categories
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    // deleteInventoryItem, // This is archiveItem now, ItemTableRow might handle actions directly later
    getActiveItems  // Using getActiveItems to only display non-archived items initially
  } = useInventory();
  const { categories, isLoadingCategories, getDefaultCategoryId } = useCategories();
  const { searchTerm } = useAppState(); 

  // State for modal and editing item
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EnhancedInventoryItem | undefined>(undefined);

  const handleSave = (
    itemData: Omit<EnhancedInventoryItem, 'id' | 'addedDate' | 'lastUpdated' | 'isArchived' | 'archivedDate' | 'originalQuantity' | 'timesRestocked' | 'totalConsumed' | 'averageConsumptionRate' | 'lastUsedDate'> | EnhancedInventoryItem
  ) => {
    if ('id' in itemData) { // existing item
      updateInventoryItem(itemData as EnhancedInventoryItem);
    } else { // new item
      addInventoryItem(itemData);
    }
    setShowModal(false);
    setEditingItem(undefined);
  };

  const openEditModal = (item: EnhancedInventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  // Memoized data processing for categorized display
  const processedData = useMemo(() => {
    const activeItems = getActiveItems(); // Filter out archived items first

    const searchedItems = activeItems.filter(item =>
      item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      // Future: add tags search here
    );

    const itemsByCategoryId = new Map<string, EnhancedInventoryItem[]>();
    const defaultCatId = getDefaultCategoryId() || 'uncategorized';

    searchedItems.forEach(item => {
      const categoryId = item.categoryId || defaultCatId;
      if (!itemsByCategoryId.has(categoryId)) {
        itemsByCategoryId.set(categoryId, []);
      }
      itemsByCategoryId.get(categoryId)!.push(item);
    });

    // Sort items within each category (e.g., by name or expiration)
    itemsByCategoryId.forEach((itemsArray, catId) => {
      itemsArray.sort((a, b) => {
        if (a.expirationDate && b.expirationDate) return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        if (a.expirationDate) return -1;
        if (b.expirationDate) return 1;
        return a.ingredientName.localeCompare(b.ingredientName);
      });
    });

    const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

    // Filter categories to display: only those with items after search, or all if no search
    const displayedCategories = searchTerm
      ? sortedCategories.filter(cat => (itemsByCategoryId.get(cat.id) || []).length > 0)
      : sortedCategories;

    return { displayedCategories, itemsByCategoryId, totalActiveItems: activeItems.length };
  }, [inventory, categories, searchTerm, isLoadingCategories, getDefaultCategoryId, getActiveItems]);

  const { displayedCategories, itemsByCategoryId, totalActiveItems } = processedData;

  // Render logic
  if (isLoadingCategories) {
    return (
      <div className="flex items-center justify-center h-64">
        <CubeTransparentIcon className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="ml-3 text-lg text-gray-600">Loading categories...</p>
      </div>
    );
  }

  const renderContent = () => {
    if (totalActiveItems === 0 && searchTerm === '') {
      return (
        <EmptyState 
          icon={<ArchiveBoxIcon />}
          title="No Inventory Items Yet"
          message="Add items to your inventory. Items with zero quantity will be archived."
          actionButton={<Button onClick={() => { setEditingItem(undefined); setShowModal(true); }} leftIcon={<PlusIcon/>}>Add New Item</Button>}
        />
      );
    }
    if (displayedCategories.length === 0 && searchTerm !== '') {
      return (
        <EmptyState
          icon={<MagnifyingGlassIcon />}
          title="No Items Found"
          message={`Your search for "${searchTerm}" did not match any inventory items.`}
        />
      );
    }
    if (displayedCategories.length === 0 && categories.length > 0 ) {
      return (
         <EmptyState
          icon={<ArchiveBoxIcon />}
          title="All Categories Empty"
          message="No items found in any category based on current filters."
        />
      );
    }
     if (categories.length === 0) {
      return (
         <EmptyState
          icon={<ArchiveBoxIcon />}
          title="No Categories Configured"
          message="Please add some item categories in the settings to organize your inventory."
           // Action button to go to settings/categories page in future
        />
      );
    }

    return (
      <div className="space-y-6">
        {displayedCategories.map(category => (
          <CategorySection
            key={category.id}
            category={category}
            items={itemsByCategoryId.get(category.id) || []}
            // defaultExpanded={true} // You can manage expansion state per category if needed
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      {renderContent()}
      {/* AddItemButton should only be available if not viewing archived items, or be context-aware */}
      <AddItemButton onClick={() => { setEditingItem(undefined); setShowModal(true); }} text="Add Inventory Item" />
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingItem(undefined); }}
        title={editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
        size="lg"
      >
        {/* Pass openEditModal to ItemTableRow or handle edit from CategorySection actions in future */}
        <InventoryItemForm initialItem={editingItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditingItem(undefined); }} />
      </Modal>
       <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-600">
        Archived items (items with zero quantity) are managed separately.
        {/* Future: Link to archived items view */}
      </div>
    </div>
  );
};

export default InventoryPage;
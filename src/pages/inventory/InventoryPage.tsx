import React, { useState } from 'react';
import { InventoryItem } from '../../../types';
import { useInventory, useAppState } from '../../../App';
import { isItemExpiringSoon, isItemExpired, isDiscreteUnit } from '../../../constants';
import { ArchiveBoxIcon, PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon } from '../../../constants';
import { Modal, Button, Card, EmptyState, AddItemButton } from '../../../components';
import InventoryItemForm from './InventoryItemForm';

const InventoryPage: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  const { searchTerm } = useAppState(); 
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);

  const handleSave = (itemData: Omit<InventoryItem, 'id'> | InventoryItem) => {
    if ('id' in itemData) {
      updateInventoryItem(itemData);
    } else {
      addInventoryItem(itemData, false); 
    }
    setShowModal(false);
    setEditingItem(undefined);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const filteredInventory = inventory.filter(item =>
    item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => {
      if (a.expirationDate && b.expirationDate) return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      if (a.expirationDate) return -1;
      if (b.expirationDate) return 1;
      return a.ingredientName.localeCompare(b.ingredientName);
  });

  return (
    <div className="container mx-auto p-4">
       {filteredInventory.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<ArchiveBoxIcon />}
          title="No Inventory Items Yet"
          message="Add items to your inventory manually or when purchasing from a shopping list."
          actionButton={<Button onClick={() => { setEditingItem(undefined); setShowModal(true); }} leftIcon={<PlusIcon/>}>Add New Item</Button>}
        />
      ) : filteredInventory.length === 0 && searchTerm !== '' ? (
         <EmptyState 
          icon={<MagnifyingGlassIcon />}
          title="No Items Found"
          message={`Your search for "${searchTerm}" did not match any inventory items.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map(item => {
            const expiringSoon = isItemExpiringSoon(item.expirationDate);
            const expired = isItemExpired(item.expirationDate);
            const lowStock = item.lowStockThreshold && item.quantity < item.lowStockThreshold;
            let cardBorder = '';
            if (expired) cardBorder = 'border-2 border-red-700 bg-red-50';
            else if (expiringSoon) cardBorder = 'border-2 border-yellow-500 bg-yellow-50';
            else if (lowStock) cardBorder = 'border-2 border-red-500';

            return (
            <Card key={item.id} className={`relative ${cardBorder}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{item.ingredientName}</h3>
                  <p className="text-gray-600">
                    {isDiscreteUnit(item.unit) 
                      ? `${Math.round(item.quantity)} ${item.unit}`
                      : `${item.quantity.toFixed(2)} ${item.unit}`
                    }
                  </p>
                  {item.expirationDate && <p className={`text-xs ${expired || expiringSoon ? 'font-semibold' : ''} ${expired ? 'text-red-700' : expiringSoon ? 'text-yellow-700' : 'text-gray-500'}`}>Exp: {new Date(item.expirationDate).toLocaleDateString()} {expired && "(Expired!)"}{!expired && expiringSoon && "(Expiring Soon!)"}</p>}
                  {lowStock && !expired && !expiringSoon && <span className="text-xs text-red-600 font-semibold">Low Stock!</span>}
                  {item.frequencyOfUse && <p className="text-xs text-gray-500">Use: {item.frequencyOfUse}</p>}
                </div>
                <div className="flex flex-col space-y-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="p-1.5"><PencilIcon className="w-4 h-4"/></Button>
                  <Button variant="danger" size="sm" onClick={() => deleteInventoryItem(item.id)} className="p-1.5"><TrashIcon className="w-4 h-4"/></Button>
                </div>
              </div>
            </Card>
          );})}
        </div>
      )}
      <AddItemButton onClick={() => { setEditingItem(undefined); setShowModal(true); }} text="Add Inventory Item" />
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(undefined); }} title={editingItem ? "Edit Inventory Item" : "Add Inventory Item"} size="lg">
        <InventoryItemForm initialItem={editingItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditingItem(undefined); }} />
      </Modal>
    </div>
  );
};

export default InventoryPage;
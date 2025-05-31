import React, { useState } from 'react';
import { Store } from '../../../types';
import { useStores, useAppState } from '../../../App';
import { BuildingStorefrontIcon, MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon } from '../../../constants';
import { Modal, Button, Card, EmptyState, AddItemButton } from '../../../components';
import StoreForm from './StoreForm';

const StoresPage: React.FC = () => { 
  const { stores, addStore, updateStore, deleteStore } = useStores();
  const { searchTerm } = useAppState();
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | undefined>(undefined);

  const handleSave = (storeData: Omit<Store, 'id'> | Store) => {
    if ('id' in storeData) {
      updateStore(storeData);
    } else {
      addStore(storeData);
    }
    setShowModal(false);
    setEditingStore(undefined);
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setShowModal(true);
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (store.location && store.location.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="container mx-auto p-4">
      {filteredStores.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<BuildingStorefrontIcon />}
          title="No Stores Added Yet"
          message="Add your favorite stores to assign items when creating shopping lists."
          actionButton={<Button onClick={() => {setEditingStore(undefined); setShowModal(true);}} leftIcon={<PlusIcon/>}>Add New Store</Button>}
        />
      ) : filteredStores.length === 0 && searchTerm !== '' ? (
         <EmptyState 
          icon={<MagnifyingGlassIcon />}
          title="No Stores Found"
          message={`Your search for "${searchTerm}" did not match any stores.`}
        />
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map(store => (
            <Card key={store.id}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{store.name}</h3>
                  {store.location && <p className="text-sm text-gray-500">{store.location}</p>}
                  {store.website && <a href={store.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline block truncate">{store.website}</a>}
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(store)}><PencilIcon/></Button>
                  <Button variant="danger" size="sm" onClick={() => deleteStore(store.id)}><TrashIcon/></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AddItemButton onClick={() => { setEditingStore(undefined); setShowModal(true); }} text="Add Store" />
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingStore(undefined); }} title={editingStore ? "Edit Store" : "Add New Store"}>
        <StoreForm initialStore={editingStore} onSave={handleSave} onClose={() => { setShowModal(false); setEditingStore(undefined); }} />
      </Modal>
    </div>
  );
};

export default StoresPage;
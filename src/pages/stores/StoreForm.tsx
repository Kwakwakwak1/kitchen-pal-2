import React, { useState, FormEvent } from 'react';
import { Store } from '../../../types';
import { Button, InputField } from '../../../components';

interface StoreFormProps {
  initialStore?: Store;
  onSave: (storeData: Omit<Store, 'id'> | Store) => void;
  onClose: () => void;
}

const StoreForm: React.FC<StoreFormProps> = ({ initialStore, onSave, onClose }) => { 
  const [name, setName] = useState(initialStore?.name || '');
  const [location, setLocation] = useState(initialStore?.location || '');
  const [website, setWebsite] = useState(initialStore?.website || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const storeData = { name, location, website };
    if (initialStore) {
      onSave({ ...initialStore, ...storeData });
    } else {
      onSave(storeData);
    }
    onClose(); 
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="Store Name" id="storeName" value={name} onChange={e => setName(e.target.value)} required />
      <InputField label="Location (Optional)" id="storeLocation" value={location} onChange={e => setLocation(e.target.value)} />
      <InputField label="Website (Optional)" id="storeWebsite" type="url" value={website} onChange={e => setWebsite(e.target.value)} />
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save Store</Button>
      </div>
    </form>
  );
};

export default StoreForm;
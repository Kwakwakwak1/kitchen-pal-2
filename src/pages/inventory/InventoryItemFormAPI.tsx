import React, { useState, FormEvent } from 'react';
import { InventoryItem, Unit, FrequencyOfUse } from '../../../types';
import { UNITS_ARRAY, FREQUENCY_OF_USE_OPTIONS } from '../../../constants';
import { InputField, SelectField, Button } from '../../../components';
import { useStores } from '../../providers/StoresProviderAPI';

interface InventoryItemFormProps {
  initialItem?: InventoryItem;
  onSave: (itemData: Omit<InventoryItem, 'id'> | InventoryItem) => void;
  onClose: () => void;
}

const InventoryItemFormAPI: React.FC<InventoryItemFormProps> = ({ initialItem, onSave, onClose }) => {
  const { stores } = useStores();
  const [ingredientName, setIngredientName] = useState(initialItem?.ingredientName || '');
  const [quantity, setQuantity] = useState(initialItem?.quantity || 0);
  const [unit, setUnit] = useState<Unit>(initialItem?.unit ?? Unit.PIECE);
  const [lowStockThreshold, setLowStockThreshold] = useState(initialItem?.lowStockThreshold || undefined); 
  const [expirationDate, setExpirationDate] = useState(initialItem?.expirationDate || '');
  const [frequencyOfUse, setFrequencyOfUse] = useState<FrequencyOfUse | ''>(initialItem?.frequencyOfUse || '');
  const [defaultStoreId, setDefaultStoreId] = useState<string>(initialItem?.defaultStoreId || '');

  const storeOptions = [{value: '', label: 'No Default Store'}, ...stores.map(s => ({ value: s.id, label: s.name }))];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const itemData = { 
      ingredientName, 
      quantity: Number(quantity), 
      unit, 
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : undefined,
      expirationDate: expirationDate || undefined,
      frequencyOfUse: frequencyOfUse as FrequencyOfUse || undefined,
      defaultStoreId: defaultStoreId || undefined,
    };
    console.log('Form submitting item data:', itemData);
    if (initialItem) {
      const finalData = { ...initialItem, ...itemData };
      console.log('Final data being sent (edit):', finalData);
      onSave(finalData);
    } else {
      console.log('Final data being sent (new):', itemData);
      onSave(itemData);
    }
    onClose(); 
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="Ingredient Name" id="invItemName" value={ingredientName} onChange={e => setIngredientName(e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Quantity" id="invItemQty" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min="0" step="any" required />
        <SelectField label="Unit" id="invItemUnit" options={UNITS_ARRAY.map(u => ({value: u, label: u}))} value={unit} onChange={e => setUnit(e.target.value as Unit)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Low Stock Threshold (Optional)" id="invItemLowStock" type="number" placeholder="e.g., 2" value={lowStockThreshold || ''} onChange={e => setLowStockThreshold(e.target.value === '' ? undefined : Number(e.target.value))} min="0" step="any" />
        <InputField label="Expiration Date (Optional)" id="invItemExpDate" type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Frequency of Use (Optional)" id="invItemFreq" options={[{value: '', label: 'Select frequency'}, ...FREQUENCY_OF_USE_OPTIONS]} value={frequencyOfUse} onChange={e => setFrequencyOfUse(e.target.value as FrequencyOfUse | '')} />
        <SelectField label="Default Store (Optional)" id="invItemStore" options={storeOptions} value={defaultStoreId} onChange={e => setDefaultStoreId(e.target.value)} />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save Item</Button>
      </div>
    </form>
  );
};

export default InventoryItemFormAPI; 
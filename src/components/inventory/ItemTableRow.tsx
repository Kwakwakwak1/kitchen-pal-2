import React from 'react';
import { EnhancedInventoryItem } from '../../../types';
import { isDiscreteUnit, isItemExpiringSoon, isItemExpired } from '../../../constants';
// Placeholder for icons, if you decide to use them later:
// import { PencilIcon, ArchiveBoxIcon } from '../../../constants'; // Assuming these are available

interface ItemTableRowProps {
  item: EnhancedInventoryItem;
  // onEdit: (item: EnhancedInventoryItem) => void; // Future prop
  // onArchive: (itemId: string) => void; // Future prop
}

const ItemTableRow: React.FC<ItemTableRowProps> = ({ item /*, onEdit, onArchive */ }) => {
  const expiringSoon = !item.isArchived && isItemExpiringSoon(item.expirationDate);
  const expired = !item.isArchived && isItemExpired(item.expirationDate);
  const lowStock = !item.isArchived && item.lowStockThreshold && item.quantity < item.lowStockThreshold;

  let rowClassName = "bg-white hover:bg-gray-50"; // Default
  if (item.isArchived) {
    rowClassName = "bg-gray-100 hover:bg-gray-200 opacity-60";
  } else if (expired) {
    rowClassName = "bg-red-50 hover:bg-red-100";
  } else if (expiringSoon) {
    rowClassName = "bg-yellow-50 hover:bg-yellow-100";
  } else if (lowStock) {
    rowClassName = "bg-orange-50 hover:bg-orange-100"; // Using orange for low stock
  }
  rowClassName += " border-b border-gray-200";


  return (
    <tr className={rowClassName}>
      {/* Checkbox column placeholder - kept for structure matching CategorySection */}
      {/* <td className="px-4 py-3 whitespace-nowrap w-12">
        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
      </td> */}

      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
        {item.ingredientName}
        {item.isArchived && <span className="ml-2 text-xs text-gray-500 font-semibold">(Archived)</span>}
        {!item.isArchived && expired && <span className="ml-2 text-xs text-red-700 font-semibold">(Expired)</span>}
        {!item.isArchived && !expired && expiringSoon && <span className="ml-2 text-xs text-yellow-700 font-semibold">(Expiring Soon)</span>}
        {!item.isArchived && !expired && !expiringSoon && lowStock && <span className="ml-2 text-xs text-orange-600 font-semibold">(Low Stock)</span>}
        {item.brand && <span className="block text-xs text-gray-500">{item.brand}</span>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {isDiscreteUnit(item.unit) ? Math.round(item.quantity) : item.quantity.toFixed(2)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium w-20">
        {/* Placeholder for future buttons. For now, a simple text or icon */}
        {/* Example using text: */}
        {/* <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button> */}
        {/* <button onClick={() => onArchive(item.id)} className="text-red-600 hover:text-red-900 ml-2">Archive</button> */}
        <span className="text-gray-400">...</span>
      </td>
    </tr>
  );
};

export default ItemTableRow;

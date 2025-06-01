import React, { useState } from 'react';
import { ItemCategory, EnhancedInventoryItem } from '../../../types'; // Assuming types are in src/types or root types.ts
import ItemTableRow from './ItemTableRow'; // Import the actual component

interface CategorySectionProps {
  category: ItemCategory;
  items: EnhancedInventoryItem[];
  defaultExpanded?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({ category, items, defaultExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded === undefined ? true : defaultExpanded);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  // Chevron SVG icons
  const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );

  const ChevronUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="mb-4 bg-white shadow rounded-lg overflow-hidden">
      {/* Category Header */}
      <button
        onClick={toggleExpansion}
        className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none"
        style={{ backgroundColor: category.color ? `${category.color}20` : '#f9fafb' }} // Light shade of category color or default
        aria-expanded={isExpanded}
        aria-controls={`category-content-${category.id}`}
      >
        <div className="flex items-center">
          <span className="mr-3 text-xl" role="img" aria-label="category icon" style={{color: category.color || 'inherit'}}>{category.icon}</span>
          <h3 className="text-lg font-semibold" style={{color: category.color ? category.color : 'inherit' }}>
            {category.name}
          </h3>
          <span className="ml-2 text-sm text-gray-500">({items.length} item{items.length !== 1 ? 's' : ''})</span>
        </div>
        <div className="flex items-center">
          {/* Placeholder for future "add item" and "edit category" buttons */}
          {/* <button className="p-1 text-gray-500 hover:text-gray-700 mr-2">✏️</button> */}
          {/* <button className="p-1 text-gray-500 hover:text-gray-700 mr-2">➕</button> */}
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </div>
      </button>

      {/* Collapsible Content: Table */}
      {isExpanded && (
        <div id={`category-content-${category.id}`} className="border-t border-gray-200">
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No items in this category.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th> */}
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map(item => (
                    <ItemTableRow key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySection;

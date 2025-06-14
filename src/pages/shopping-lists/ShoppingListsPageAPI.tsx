import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingList, ShoppingListStatus } from '../../../types';
import { useShoppingLists } from '../../providers/ShoppingListsProviderAPI';
import { useAppState } from '../../providers/AppStateProvider';
import { 
  ShoppingCartIcon, ArchiveBoxIcon, ArrowPathIcon, TrashIcon, 
  PlusIcon, XMarkIcon, PencilIcon, MagnifyingGlassIcon 
} from '../../../constants';
import { Modal, Button, Card, EmptyState, BottomActionBar } from '../../../components';

const ShoppingListsPageAPI: React.FC = () => {
  const navigate = useNavigate();
  const { 
    shoppingLists, 
    archivedShoppingLists, 
    deleteShoppingList, 
    archiveShoppingList, 
    unarchiveShoppingList, 
    deleteArchivedShoppingList, 
    bulkDeleteShoppingLists, 
    bulkArchiveShoppingLists, 
    bulkDeleteArchivedShoppingLists 
  } = useShoppingLists();
  const { searchTerm, setSearchTerm } = useAppState();
  
  type ShoppingListTab = 'active' | 'completed' | 'archived';
  const [activeTab, setActiveTab] = useState<ShoppingListTab>('active');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Helper function to determine if a list is completed
  const isListCompleted = (list: ShoppingList): boolean => {
    return list.items.length > 0 && list.items.every(item => item.purchased);
  };

  // Filter lists based on status and search term
  const activeLists = shoppingLists.filter(list => 
    list.status === ShoppingListStatus.ACTIVE &&
    !isListCompleted(list) &&
    (list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     list.items.some(item => item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())))
  ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completedLists = shoppingLists.filter(list => 
    list.status === ShoppingListStatus.ACTIVE &&
    isListCompleted(list) &&
    (list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     list.items.some(item => item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())))
  ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const archivedListsFiltered = archivedShoppingLists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.items.some(item => item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a,b) => new Date(b.archivedAt || b.createdAt).getTime() - new Date(a.archivedAt || a.createdAt).getTime());

  const getCurrentLists = () => {
    switch (activeTab) {
      case 'active': return activeLists;
      case 'completed': return completedLists;
      case 'archived': return archivedListsFiltered;
      default: return activeLists;
    }
  };

  const handleListSelection = (listId: string) => {
    setSelectedListIds(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const handleSelectAll = () => {
    const currentLists = getCurrentLists();
    setSelectedListIds(currentLists.map(list => list.id));
  };

  const handleDeselectAll = () => {
    setSelectedListIds([]);
  };

  const handleBulkArchive = () => {
    bulkArchiveShoppingLists(selectedListIds);
    setSelectedListIds([]);
    setSelectionMode(false);
    setShowArchiveConfirm(false);
  };

  const handleBulkDelete = () => {
    if (activeTab === 'archived') {
      bulkDeleteArchivedShoppingLists(selectedListIds);
    } else {
      bulkDeleteShoppingLists(selectedListIds);
    }
    setSelectedListIds([]);
    setSelectionMode(false);
    setShowDeleteConfirm(false);
  };

  const getStatusBadge = (list: ShoppingList) => {
    if (list.status === ShoppingListStatus.ARCHIVED) {
      return <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Archived</span>;
    } else if (isListCompleted(list)) {
      return <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Completed</span>;
    } else {
      return <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Active</span>;
    }
  };

  const renderShoppingListCard = (list: ShoppingList) => {
    const isSelected = selectedListIds.includes(list.id);
    const purchasedCount = list.items.filter(item => item.purchased).length;
    const progressPercentage = list.items.length > 0 ? (purchasedCount / list.items.length) * 100 : 0;
    const completed = isListCompleted(list);

    return (
      <Card 
        key={list.id} 
        onClick={() => selectionMode ? handleListSelection(list.id) : navigate(`/shopping_list_detail/${list.id}`)} 
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      >
        <div className="flex items-center justify-between">
          {selectionMode && (
            <div className="mr-4">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleListSelection(list.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          )}
          
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-blue-600">{list.name}</h3>
              {getStatusBadge(list)}
            </div>
            
            <div className="space-y-1 text-sm text-gray-500">
              <p>Created: {new Date(list.createdAt).toLocaleDateString()}</p>
              {completed && <p>Completed: {new Date(list.createdAt).toLocaleDateString()}</p>}
              {list.archivedAt && <p>Archived: {new Date(list.archivedAt).toLocaleDateString()}</p>}
              <p>{list.items.length} items ({purchasedCount} purchased)</p>
            </div>

            {/* Progress bar */}
            {list.items.length > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {!selectionMode && (
            <div className="flex space-x-2 ml-4">
              {activeTab === 'completed' && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    archiveShoppingList(list.id); 
                  }}
                  title="Archive this list"
                >
                  <ArchiveBoxIcon className="w-4 h-4" />
                </Button>
              )}
              
              {activeTab === 'archived' && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    unarchiveShoppingList(list.id); 
                  }}
                  title="Restore from archive"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </Button>
              )}

              <Button 
                variant="danger" 
                size="sm" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (activeTab === 'archived') {
                    deleteArchivedShoppingList(list.id);
                  } else {
                    deleteShoppingList(list.id);
                  }
                }}
                title="Delete this list"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const currentLists = getCurrentLists();
  const hasLists = activeLists.length > 0 || completedLists.length > 0 || archivedListsFiltered.length > 0;

  return (
    <div className="container mx-auto p-4 pb-24">
      {/* Bulk Actions Bar */}
      {selectionMode && (
        <div className="sticky top-0 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-blue-700 font-medium">
              {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>
          <div className="flex space-x-2">
            {activeTab === 'completed' && selectedListIds.length > 0 && (
              <Button variant="secondary" onClick={() => setShowArchiveConfirm(true)}>
                Archive Selected
              </Button>
            )}
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete Selected
            </Button>
            <Button variant="ghost" onClick={() => { setSelectionMode(false); setSelectedListIds([]); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Shopping Lists</h1>
        <div className="flex space-x-2">
          {hasLists && (
            <Button 
              variant="ghost" 
              onClick={() => setSelectionMode(!selectionMode)}
              leftIcon={selectionMode ? <XMarkIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
            >
              {selectionMode ? 'Cancel' : 'Select'}
            </Button>
          )}
          <Button 
            onClick={() => navigate('/generate_shopping_list')} 
            leftIcon={<PlusIcon/>}
          >
            New List
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active ({activeLists.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Completed ({completedLists.length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'archived'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Archived ({archivedListsFiltered.length})
          </button>
        </nav>
      </div>

      {/* Lists Content */}
      {currentLists.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<ShoppingCartIcon />}
          title={`No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Shopping Lists`}
          message={
            activeTab === 'active' 
              ? "Create a shopping list from your recipes or add items manually."
              : activeTab === 'completed'
              ? "Complete some shopping lists to see them here."
              : "Archive completed lists to see them here."
          }
          actionButton={
            activeTab === 'active' ? (
              <Button onClick={() => navigate('/generate_shopping_list')} leftIcon={<PlusIcon/>}>
                Generate New List
              </Button>
            ) : undefined
          }
        />
      ) : currentLists.length === 0 && searchTerm !== '' ? (
        <EmptyState 
          icon={<MagnifyingGlassIcon />}
          title="No Shopping Lists Found"
          message={`Your search for "${searchTerm}" did not match any ${activeTab} shopping lists.`}
        />
      ) : (
        <div className="space-y-4">
          {currentLists.map(renderShoppingListCard)}
        </div>
      )}

      {/* Bottom Action Bar with Search and New List */}
      <BottomActionBar
        searchValue={searchTerm || ''}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search shopping lists..."
        actionButton={
          <Button 
            onClick={() => navigate('/generate_shopping_list')} 
            leftIcon={<PlusIcon />}
            className="rounded-full"
          >
            New List
          </Button>
        }
      />

      {/* Confirmation Modals */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)} 
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete {selectedListIds.length} shopping list{selectedListIds.length !== 1 ? 's' : ''}? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDelete}>
              Delete {selectedListIds.length} List{selectedListIds.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showArchiveConfirm} 
        onClose={() => setShowArchiveConfirm(false)} 
        title="Confirm Archive"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to archive {selectedListIds.length} completed shopping list{selectedListIds.length !== 1 ? 's' : ''}? 
            You can restore them later from the archived section.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowArchiveConfirm(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleBulkArchive}>
              Archive {selectedListIds.length} List{selectedListIds.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShoppingListsPageAPI; 
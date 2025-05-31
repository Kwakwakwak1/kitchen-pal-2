# Shopping List Archiving & Deletion Feature Specification

## Overview

This specification outlines the implementation of archiving functionality for completed shopping lists and enhanced deletion capabilities. The goal is to help users manage their shopping list history while maintaining a clean and organized interface for active lists.

## Current State Analysis

### Existing Shopping List Structure
```typescript
export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  items: ShoppingListItem[];
  notes?: string;
}
```

### Current Limitations
1. **No archiving mechanism**: Completed shopping lists remain in the active list indefinitely
2. **Limited deletion options**: Only individual list deletion is available
3. **No status tracking**: No distinction between active, completed, and archived lists
4. **Poor list management**: Old completed lists clutter the interface
5. **No bulk operations**: Users cannot perform bulk actions on multiple lists

## Requirements

### 1. Shopping List Archiving System

#### 1.1 Enhanced Data Model
```typescript
export enum ShoppingListStatus {
  ACTIVE = 'active',           // List is in progress
  COMPLETED = 'completed',     // All items purchased, but not archived
  ARCHIVED = 'archived'        // Completed list that has been archived
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string;
  items: ShoppingListItem[];
  notes?: string;
  status: ShoppingListStatus;        // NEW: Status tracking
  completedAt?: string;              // NEW: When list was completed (all items purchased)
  archivedAt?: string;               // NEW: When list was archived
}
```

#### 1.2 Automatic Status Management
- **Active → Completed**: Automatically transition when all items are marked as purchased
- **Completed → Archived**: Manual action by user or automatic after configurable period
- **Status Display**: Clear visual indicators for each status

#### 1.3 Archive Actions
```typescript
// New context methods
export interface ShoppingListsContextType {
  shoppingLists: ShoppingList[];
  archivedShoppingLists: ShoppingList[];     // NEW: Separate archived lists
  addShoppingList: (list: Omit<ShoppingList, 'id' | 'createdAt' | 'status'>) => string;
  updateShoppingList: (list: ShoppingList) => void;
  deleteShoppingList: (listId: string) => void;
  archiveShoppingList: (listId: string) => void;        // NEW: Archive a completed list
  unarchiveShoppingList: (listId: string) => void;      // NEW: Restore from archive
  deleteArchivedShoppingList: (listId: string) => void; // NEW: Permanently delete archived
  getShoppingListById: (listId: string) => ShoppingList | undefined;
  bulkDeleteShoppingLists: (listIds: string[]) => void;           // NEW: Bulk operations
  bulkArchiveShoppingLists: (listIds: string[]) => void;          // NEW: Bulk archive
  bulkDeleteArchivedShoppingLists: (listIds: string[]) => void;   // NEW: Bulk delete archived
}
```

### 2. Enhanced Shopping Lists Interface

#### 2.1 Tabbed Interface
```typescript
type ShoppingListTab = 'active' | 'completed' | 'archived';
```

The shopping lists page should have three tabs:
- **Active Lists**: Lists with unpurchased items (status: ACTIVE)
- **Completed Lists**: Lists with all items purchased but not archived (status: COMPLETED)
- **Archived Lists**: Archived completed lists (status: ARCHIVED)

#### 2.2 List Cards Enhancement
Each shopping list card should display:
- **Status Badge**: Visual indicator (Active/Completed/Archived)
- **Completion Information**: Date completed, percentage purchased
- **Action Buttons**: Based on status (Archive, Unarchive, Delete, Bulk select)
- **Quick Stats**: Item count, total cost estimate if available

#### 2.3 Bulk Operations Interface
```typescript
interface BulkActionsState {
  selectedListIds: string[];
  selectionMode: boolean;
  availableActions: BulkAction[];
}

interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType;
  action: (listIds: string[]) => void;
  destructive?: boolean;
  requiresConfirmation?: boolean;
}
```

### 3. Automatic Archiving System

#### 3.1 Configuration
```typescript
export interface UserPreferences {
  defaultStoreId?: string;
  measurementSystem?: MeasurementSystem;
  avatarUrl?: string;
  autoArchiveCompletedLists?: boolean;           // NEW: Auto-archive setting
  autoArchiveAfterDays?: number;                 // NEW: Days before auto-archive (default: 30)
  deleteArchivedAfterDays?: number;              // NEW: Days before auto-delete archived (default: 365)
}
```

#### 3.2 Auto-Archive Logic
- Check completed lists daily
- Archive lists older than `autoArchiveAfterDays` setting
- Show notifications when lists are auto-archived
- Provide undo option for recent auto-archives

### 4. Archive Management Features

#### 4.1 Archive Dashboard
- **Archive Statistics**: Total archived lists, storage used, oldest archived list
- **Quick Actions**: View all archived, bulk delete old archives, export archive data
- **Search & Filter**: Search archived lists by name, date range, items

#### 4.2 Archive Restoration
- **Unarchive Action**: Move archived list back to completed status
- **Partial Restoration**: Create new list from archived list items
- **Template Creation**: Create recipe or template from archived shopping list

### 5. Data Management & Performance

#### 5.1 Storage Strategy
```typescript
// Separate storage keys for better performance
const ACTIVE_LISTS_KEY = 'activeLists';
const COMPLETED_LISTS_KEY = 'completedLists';
const ARCHIVED_LISTS_KEY = 'archivedLists';
```

#### 5.2 Migration Strategy
```typescript
// Migration function for existing data
const migrateShoppingListsToNewFormat = (existingLists: OldShoppingList[]): ShoppingList[] => {
  return existingLists.map(list => ({
    ...list,
    status: determineListStatus(list),
    completedAt: list.items.every(item => item.purchased) ? list.createdAt : undefined,
    archivedAt: undefined
  }));
};

const determineListStatus = (list: OldShoppingList): ShoppingListStatus => {
  if (list.items.length === 0) return ShoppingListStatus.ACTIVE;
  if (list.items.every(item => item.purchased)) return ShoppingListStatus.COMPLETED;
  return ShoppingListStatus.ACTIVE;
};
```

### 6. User Interface Specifications

#### 6.1 Shopping Lists Page Layout
```typescript
const ShoppingListsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ShoppingListTab>('active');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  
  // Tab content rendering based on status
  // Bulk selection interface
  // Action confirmations
};
```

#### 6.2 Archive Section Design
- **Clear visual separation** from active lists
- **Compact view** for archived items (less detail than active)
- **Date-based grouping** (This month, Last month, Older)
- **Search and filter capabilities**

#### 6.3 Bulk Actions Interface
```typescript
const BulkActionsBar: React.FC<{
  selectedCount: number;
  onArchive: () => void;
  onDelete: () => void;
  onCancel: () => void;
}> = ({ selectedCount, onArchive, onDelete, onCancel }) => (
  <div className="sticky top-0 bg-blue-50 border-b border-blue-200 p-4 flex justify-between items-center">
    <span className="text-blue-700 font-medium">
      {selectedCount} list{selectedCount !== 1 ? 's' : ''} selected
    </span>
    <div className="flex gap-2">
      <Button variant="secondary" onClick={onArchive}>
        Archive Selected
      </Button>
      <Button variant="danger" onClick={onDelete}>
        Delete Selected
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  </div>
);
```

### 7. Implementation Phases

#### Phase 1: Core Archiving Infrastructure
1. **Data Model Updates**: Add status, completedAt, archivedAt fields
2. **Context Enhancement**: Add archive-related methods
3. **Automatic Status Transitions**: Implement active → completed logic
4. **Data Migration**: Migrate existing shopping lists

#### Phase 2: Archive Interface
1. **Tabbed Interface**: Implement Active/Completed/Archived tabs
2. **Archive Actions**: Add archive/unarchive buttons and logic
3. **Visual Indicators**: Status badges and completion info
4. **Basic Archive View**: Display archived lists

#### Phase 3: Bulk Operations
1. **Selection Interface**: Multi-select functionality
2. **Bulk Actions Bar**: Archive/Delete multiple lists
3. **Confirmation Dialogs**: Safe bulk operations
4. **Performance Optimization**: Handle large selections

#### Phase 4: Advanced Features
1. **Auto-Archive System**: Configurable automatic archiving
2. **Archive Management**: Dashboard and statistics
3. **Search & Filter**: Enhanced archive discovery
4. **Export/Import**: Archive data portability

### 8. Technical Considerations

#### 8.1 Performance Optimizations
- **Lazy Loading**: Load archived lists only when archive tab is accessed
- **Pagination**: Implement pagination for large archive collections
- **Virtual Scrolling**: Handle large lists efficiently
- **Debounced Search**: Optimize archive search performance

#### 8.2 Data Integrity
- **Validation**: Ensure status transitions are valid
- **Backup**: Create backups before bulk operations
- **Rollback**: Provide undo for accidental bulk deletions
- **Consistency**: Maintain referential integrity

#### 8.3 User Experience
- **Progress Indicators**: Show progress for bulk operations
- **Undo Actions**: Allow reversal of recent archive actions
- **Keyboard Shortcuts**: Efficient bulk selection (Ctrl+A, Shift+Click)
- **Mobile Optimization**: Touch-friendly bulk selection

### 9. Success Metrics

#### 9.1 User Engagement
- **Archive Usage**: Percentage of users who archive lists
- **List Management**: Reduction in active list clutter
- **Feature Adoption**: Bulk operations usage rate

#### 9.2 Performance Metrics
- **Load Time**: Archive page load performance
- **Operation Speed**: Bulk action completion time
- **Storage Efficiency**: Reduced active data size

#### 9.3 User Satisfaction
- **Interface Clarity**: User feedback on new tabbed interface
- **Feature Utility**: Archive and bulk operation usefulness
- **Migration Success**: Smooth transition from old system

### 10. Future Enhancements

#### 10.1 Advanced Archive Features
- **Archive Analytics**: Shopping pattern analysis from archived lists
- **Smart Suggestions**: Recipe recommendations based on archived shopping patterns
- **Sharing Archives**: Share archived lists as templates

#### 10.2 Integration Opportunities
- **Recipe Integration**: Create recipes from successful shopping lists
- **Inventory Predictions**: Use archive data to predict shopping needs
- **Budget Tracking**: Track spending patterns across archived lists

## Implementation Timeline

- **Week 1-2**: Phase 1 - Core infrastructure and data migration
- **Week 3-4**: Phase 2 - Archive interface and basic functionality
- **Week 5-6**: Phase 3 - Bulk operations and advanced UI
- **Week 7-8**: Phase 4 - Auto-archive and management features
- **Week 9**: Testing, optimization, and documentation
- **Week 10**: User testing and feedback incorporation

## Conclusion

This archiving and deletion system will significantly improve shopping list management by:
1. **Reducing Interface Clutter**: Active lists remain focused and manageable
2. **Preserving History**: Completed lists are safely archived for reference
3. **Efficient Management**: Bulk operations enable quick list organization
4. **Automatic Maintenance**: Auto-archiving reduces manual management overhead
5. **Enhanced User Experience**: Clear status tracking and intuitive interfaces

The implementation provides a solid foundation for future shopping list analytics and pattern recognition features while maintaining the simplicity and usability of the current system. 
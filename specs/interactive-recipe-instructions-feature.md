# Interactive Recipe Instructions Feature Specification

## Overview

This specification outlines the implementation of an interactive recipe viewing experience that addresses the common UX issue of users having to scroll back and forth between ingredients and instructions. The feature introduces dynamic serving size adjustment and clickable/hoverable ingredient mentions within instructions.

## Problem Statement

**Current Pain Points:**
1. Users must manually calculate ingredient amounts when changing serving sizes
2. While reading instructions, users frequently need to scroll back to check ingredient quantities
3. No visual connection between instruction steps and required ingredients
4. Instructions are static text with no contextual information

**User Story:**
> "As a user following a recipe, I want to select my desired serving size and see all ingredient amounts update automatically. When I'm reading the instructions and encounter an ingredient mention, I want to quickly see how much of that ingredient I need without scrolling back to the ingredients list."

## Feature Requirements

### Core Features

#### 1. Dynamic Serving Size Adjustment
- **Location**: Recipe detail page header, near the current "Servings: 4" display
- **Behavior**: 
  - Replace static servings display with interactive input/selector
  - Update all ingredient quantities in real-time when servings change
  - Maintain proportional scaling (e.g., 2 servings = half quantities, 6 servings = 1.5x quantities)
  - Persist selected serving size during recipe viewing session

#### 2. Interactive Ingredient Mentions in Instructions
- **Detection**: Automatically identify ingredient names mentioned in instruction text
- **Interaction Methods**:
  - **Desktop**: Hover over ingredient mentions to show tooltip with quantity
  - **Mobile**: Tap ingredient mentions to show popup with quantity
  - **Visual Indicator**: Subtle styling (underline, different color) to indicate interactive elements
- **Information Display**: Show scaled quantity for current serving size selection

#### 3. Enhanced Recipe Layout
- **Responsive Design**: Maintain current layout but enhance interactivity
- **Real-time Updates**: All ingredient displays update immediately when serving size changes
- **Consistent Styling**: Interactive elements follow existing design system

### Technical Requirements

#### 1. Ingredient Detection Algorithm
- **Pattern Matching**: Identify ingredient names within instruction text
- **Normalization**: Use existing `normalizeIngredientName` utility for matching
- **Fuzzy Matching**: Handle variations in ingredient names (e.g., "onions" vs "onion")
- **Context Awareness**: Avoid false positives (e.g., "salt" in "assault")

#### 2. Quantity Calculation
- **Dynamic Scaling**: Calculate quantities based on selected servings vs default servings
- **Unit Conversion**: Maintain existing unit conversion logic
- **Precision**: Handle fractional servings and appropriate rounding
- **Optional Ingredients**: Clearly indicate when hovering over optional ingredients

#### 3. Performance Considerations
- **Efficient Parsing**: Parse instructions once and cache results
- **Minimal Re-renders**: Optimize component updates for serving size changes
- **Debounced Updates**: Prevent excessive calculations during rapid serving changes

## User Experience Flow

### Primary Flow: Viewing Recipe with Dynamic Servings

1. **Recipe Load**
   - User navigates to recipe detail page
   - Page displays with default serving size selected
   - Ingredients list shows amounts for default servings
   - Instructions are parsed and ingredient mentions are identified

2. **Serving Size Adjustment**
   - User sees editable serving size field in recipe header
   - User changes serving size (e.g., from 4 to 6)
   - All ingredient quantities update immediately to reflect new serving size
   - Interactive elements in instructions update to show new quantities

3. **Instruction Reading with Ingredient Context**
   - User reads instructions step by step
   - When encountering ingredient mention (e.g., "Add the chopped onion")
   - **Desktop**: User hovers over "onion" → Tooltip shows "1.5 medium onions"
   - **Mobile**: User taps "onion" → Small popup shows "1.5 medium onions"
   - User continues reading without needing to scroll back to ingredients

### Secondary Flow: Visual Feedback and Error States

1. **Loading State**
   - Show skeleton/loading state while parsing instructions
   - Graceful degradation if parsing fails

2. **No Matches State**
   - If no ingredient matches found in instructions, feature remains passive
   - No visual indicators for interactivity

3. **Edge Cases**
   - Handle ingredients with multiple units or complex preparations
   - Display appropriate messages for optional ingredients
   - Show "Not specified" for ingredients mentioned but not in recipe list

## Detailed Implementation Plan

### Phase 1: Dynamic Serving Size Control

#### Component: `ServingSizeSelector`
```typescript
interface ServingSizeSelectorProps {
  defaultServings: number;
  currentServings: number;
  onServingsChange: (servings: number) => void;
  maxServings?: number;
  minServings?: number;
}
```

**Features:**
- Increment/decrement buttons for easy adjustment
- Direct input field for specific values
- Validation for reasonable serving ranges (1-50)
- Clear visual feedback for current selection

#### Component Updates: `RecipeDetailPage`
- Add state for current serving size
- Calculate scaled ingredient quantities in real-time
- Update ingredients list display
- Pass serving context to instruction components

### Phase 2: Instruction Parsing and Enhancement

#### Utility: `instructionParser.ts`
```typescript
interface IngredientMention {
  ingredient: RecipeIngredient;
  startIndex: number;
  endIndex: number;
  matchedText: string;
  scaledQuantity: number;
  scaledUnit: string;
}

interface ParsedInstructions {
  originalText: string;
  segments: Array<{
    text: string;
    isIngredient: boolean;
    ingredientMention?: IngredientMention;
  }>;
}

function parseInstructionsForIngredients(
  instructions: string,
  ingredients: RecipeIngredient[],
  currentServings: number,
  defaultServings: number
): ParsedInstructions;
```

**Algorithm:**
1. Split instructions into sentences/phrases
2. For each ingredient in recipe, search for mentions in instructions
3. Use fuzzy matching to catch variations
4. Calculate scaled quantities based on serving size
5. Create segment map for rendering

#### Component: `InteractiveInstructions`
```typescript
interface InteractiveInstructionsProps {
  instructions: string;
  ingredients: RecipeIngredient[];
  currentServings: number;
  defaultServings: number;
}
```

**Rendering Logic:**
- Parse instructions into segments
- Render interactive segments with event handlers
- Style ingredient mentions with visual indicators
- Implement tooltip/popup system for ingredient details

### Phase 3: Tooltip and Popup System

#### Component: `IngredientTooltip`
```typescript
interface IngredientTooltipProps {
  ingredient: RecipeIngredient;
  scaledQuantity: number;
  scaledUnit: string;
  isOptional: boolean;
  trigger: 'hover' | 'click';
  children: React.ReactNode;
}
```

**Features:**
- Responsive positioning (avoid viewport edges)
- Rich content display (quantity, unit, optional status)
- Smooth animations (fade in/out)
- Accessibility compliance (ARIA labels, keyboard navigation)

### Phase 4: Mobile Optimization

#### Touch-Friendly Interactions
- Larger tap targets for ingredient mentions
- Modal-style popups instead of tooltips
- Swipe gestures for serving size adjustment
- Optimized typography for readability

#### Responsive Design Enhancements
- Adjust layout for smaller screens
- Stack ingredients and instructions vertically on mobile
- Optimize popup positioning for mobile viewports

## Data Structures

### Enhanced Recipe State
```typescript
interface RecipeViewState {
  recipe: Recipe;
  currentServings: number;
  scaledIngredients: ScaledIngredient[];
  parsedInstructions: ParsedInstructions;
  isParsingInstructions: boolean;
}

interface ScaledIngredient extends RecipeIngredient {
  scaledQuantity: number;
  displayQuantity: string; // Formatted for display
}
```

### Instruction Parsing Cache
```typescript
interface InstructionParseCache {
  [recipeId: string]: {
    parsedInstructions: ParsedInstructions;
    lastUpdated: number;
    ingredientHashes: string[]; // For cache invalidation
  };
}
```

## UI/UX Design Specifications

### Visual Design

#### Serving Size Selector
- **Location**: Recipe header, replacing static "Servings: 4" text
- **Style**: Inline input with +/- buttons or dropdown
- **Size**: Compact but easily accessible
- **Colors**: Follow existing color scheme
- **States**: Default, focused, disabled

#### Ingredient Mentions in Instructions
- **Styling**: 
  - Subtle underline (1px solid, theme accent color)
  - Slightly different text color (blue-600 for light theme)
  - Cursor changes to pointer on hover
- **Hover State**: 
  - Slightly bolder underline
  - Background color change (very subtle)
- **Active State**: 
  - Maintain visual feedback during popup display

#### Tooltips and Popups
- **Desktop Tooltips**:
  - Dark background with white text
  - Small arrow pointing to trigger element
  - 8px border radius
  - Drop shadow for depth
  - Max width to prevent overflow
- **Mobile Popups**:
  - Card-style design matching existing modals
  - Centered or positioned near trigger
  - Close button or tap-outside-to-close
  - Smooth slide-up animation

### Accessibility

#### ARIA Compliance
- `aria-describedby` for ingredient mentions
- `role="tooltip"` for popup content
- `aria-expanded` for interactive states
- Keyboard navigation support

#### Screen Reader Support
- Announce serving size changes
- Describe ingredient quantities when focused
- Provide alternative text for visual indicators

#### Keyboard Navigation
- Tab through ingredient mentions in instructions
- Enter/Space to activate ingredient details
- Escape to close popups
- Arrow keys for serving size adjustment

## Error Handling and Edge Cases

### Parsing Failures
- **Scenario**: Instructions contain no recognizable ingredient names
- **Handling**: Graceful degradation to static instruction display
- **UX**: No visual indicators, normal text rendering

### Unit Conversion Errors
- **Scenario**: Cannot convert between recipe units and display units
- **Handling**: Show original units with warning indicator
- **UX**: Tooltip shows "Cannot convert units" message

### Performance Issues
- **Scenario**: Very long instructions with many ingredients
- **Handling**: Implement parsing debouncing and caching
- **UX**: Loading indicators for parsing operations

### Invalid Serving Sizes
- **Scenario**: User enters 0, negative, or extremely large numbers
- **Handling**: Input validation with helpful error messages
- **UX**: Visual feedback and automatic correction

## Testing Strategy

### Unit Tests
1. **Ingredient Parsing Logic**
   - Test ingredient name detection
   - Test fuzzy matching accuracy
   - Test quantity scaling calculations
   - Test edge cases (optional ingredients, unit conversions)

2. **Serving Size Calculations**
   - Test proportional scaling
   - Test fractional servings
   - Test boundary conditions (minimum/maximum servings)

3. **Component Rendering**
   - Test instruction segment rendering
   - Test tooltip positioning
   - Test responsive behavior

### Integration Tests
1. **Full Recipe View Flow**
   - Load recipe → Change servings → Verify ingredient updates
   - Parse instructions → Interact with ingredients → Verify popups

2. **Cross-Component Communication**
   - Serving size changes propagate correctly
   - Instruction updates reflect current serving context

### User Acceptance Tests
1. **Desktop Experience**
   - Hover interactions work smoothly
   - Tooltips don't interfere with reading
   - Serving size changes are intuitive

2. **Mobile Experience**
   - Tap interactions are responsive
   - Popups don't block important content
   - Touch targets are appropriately sized

3. **Accessibility**
   - Screen reader compatibility
   - Keyboard navigation works completely
   - High contrast mode support

## Performance Considerations

### Optimization Strategies
1. **Lazy Parsing**: Parse instructions only when component is visible
2. **Memoization**: Cache parsed results and scaled calculations
3. **Debouncing**: Limit parsing frequency during rapid serving changes
4. **Virtual Scrolling**: For very long instruction lists (future enhancement)

### Memory Management
1. **Cache Limits**: Implement LRU cache for parsed instructions
2. **Cleanup**: Remove event listeners and clear caches on unmount
3. **Bundle Size**: Use dynamic imports for tooltip libraries if needed

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Implement `ServingSizeSelector` component
- [ ] Add serving size state to `RecipeDetailPage`
- [ ] Create dynamic ingredient quantity calculation
- [ ] Update ingredient list rendering

### Phase 2: Instruction Parsing (Week 3-4)
- [ ] Develop ingredient detection algorithm
- [ ] Create `instructionParser` utility
- [ ] Implement `InteractiveInstructions` component
- [ ] Add basic styling for ingredient mentions

### Phase 3: Interactivity (Week 5-6)
- [ ] Build tooltip/popup system
- [ ] Implement hover and click handlers
- [ ] Add desktop and mobile interaction modes
- [ ] Polish animations and transitions

### Phase 4: Polish and Testing (Week 7-8)
- [ ] Comprehensive testing suite
- [ ] Accessibility audit and fixes
- [ ] Performance optimization
- [ ] Documentation and code cleanup
- [ ] User acceptance testing

## Future Enhancements

### Advanced Features
1. **Smart Ingredient Substitutions**: Suggest alternatives when hovering over ingredients
2. **Visual Recipe Steps**: Add images or icons to instruction steps
3. **Timer Integration**: Add timers for cooking steps mentioned in instructions
4. **Voice Instructions**: Read instructions aloud with ingredient context
5. **Recipe Notes**: Allow users to add personal notes to specific instructions

### Data Enhancements
1. **Structured Instructions**: Support for step-by-step instruction formatting
2. **Cooking Techniques**: Hover over cooking terms for explanations
3. **Equipment Context**: Show required equipment for each step
4. **Nutritional Information**: Display nutrition facts for current serving size

### Integration Opportunities
1. **Shopping List Integration**: Add missing ingredients directly from instruction view
2. **Inventory Checking**: Real-time availability checking while reading
3. **Recipe Scaling**: Advanced scaling with equipment limitations
4. **Social Features**: Share specific recipe adaptations

This feature represents a significant UX improvement that aligns with modern cooking app expectations while leveraging the existing robust recipe and inventory management system. The phased implementation ensures manageable development cycles with clear milestones and testing opportunities. 
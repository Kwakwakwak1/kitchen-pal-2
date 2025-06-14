# Recipe URL Import Feature Specification

## Overview

This feature allows users to import recipes by providing a URL to a recipe webpage. The system will scrape the content, extract recipe information using structured data (JSON-LD, Microdata, RDFa), and populate the recipe form with the extracted data.

## Goals

- Enable users to quickly import recipes from popular recipe websites
- Automatically populate recipe form fields including ingredients, instructions, timing, and metadata
- Provide fallback parsing for sites without structured data
- Maintain existing manual recipe entry workflow as primary option
- Ensure responsive and accessible user experience

## Technical Architecture

### 1. Data Extraction Strategy

#### Primary: Structured Data Parsing
- **JSON-LD** (most common modern format)
- **Microdata** (older but still widely used)
- **RDFa** (less common but supported)

#### Secondary: Fallback HTML Parsing
- CSS selector-based extraction
- Common recipe website patterns
- Heuristic-based content detection

#### Supported Schema Types
- `Recipe` from schema.org
- `NutritionInformation` (if available)
- `Person` or `Organization` (for author/source)

### 2. Core Components

#### 2.1 URL Scraping Service
```typescript
interface RecipeScrapingResult {
  success: boolean;
  data?: ScrapedRecipeData;
  error?: string;
  warnings?: string[];
}

interface ScrapedRecipeData {
  name: string;
  description?: string;
  ingredients: ScrapedIngredient[];
  instructions: string | string[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: number;
  author?: string;
  sourceUrl: string;
  sourceName?: string;
  tags?: string[];
  imageUrl?: string;
  nutrition?: ScrapedNutrition;
}

interface ScrapedIngredient {
  text: string; // Original text from recipe
  name?: string; // Parsed ingredient name
  quantity?: number; // Parsed quantity
  unit?: string; // Parsed unit
}

interface ScrapedNutrition {
  calories?: number;
  servingSize?: string;
  // Additional nutrition info if available
}
```

#### 2.2 Recipe URL Import Component
- Input field for URL entry
- Import button with loading state
- Preview of scraped data before save
- Manual editing capabilities
- Error handling and user feedback

#### 2.3 Data Processing Pipeline
1. **URL Validation**: Check if URL is valid and accessible
2. **Content Fetching**: Retrieve HTML content (with CORS proxy if needed)
3. **Structured Data Extraction**: Parse JSON-LD, Microdata, RDFa
4. **Fallback Parsing**: If structured data fails, use CSS selectors
5. **Data Normalization**: Convert to application's recipe format
6. **Ingredient Parsing**: Extract quantity, unit, and name from ingredient strings
7. **Time Parsing**: Convert duration strings to standardized format

### 3. Implementation Details

#### 3.1 Dependencies to Add
```json
{
  "dependencies": {
    "cheerio": "^1.0.0-rc.12", // Server-side HTML parsing
    "node-html-parser": "^6.1.12", // Lightweight HTML parsing alternative
    "recipe-schema-parser": "^2.0.0", // Specialized recipe parsing
    "cors-anywhere": "^0.4.4" // CORS proxy for client-side requests
  },
  "devDependencies": {
    "@types/cheerio": "^0.22.31"
  }
}
```

#### 3.2 API Layer
Since this is a client-side application, we'll need to handle CORS issues:

**Option A: CORS Proxy Service**
- Use public CORS proxy (allorigins.win, corsproxy.io)
- Implement rate limiting and error handling
- Consider reliability and uptime

**Option B: Browser Extension Approach**
- Manifest V3 extension with host permissions
- Better reliability but requires installation

**Option C: Server Component (Future Enhancement)**
- Express.js backend for scraping
- Better control and no CORS issues
- Requires hosting and deployment

#### 3.3 Ingredient Parsing Algorithm
```typescript
interface IngredientParser {
  parseIngredient(text: string): ParsedIngredient;
  normalizeUnit(unit: string): Unit;
  extractQuantity(text: string): number | null;
  extractIngredientName(text: string): string;
}

interface ParsedIngredient {
  originalText: string;
  quantity: number;
  unit: Unit;
  ingredientName: string;
  isOptional: boolean;
  notes?: string; // Additional preparation notes
}
```

Common patterns to handle:
- `"1 cup chopped onions"` → quantity: 1, unit: cup, name: "onions", notes: "chopped"
- `"2-3 large tomatoes"` → quantity: 2.5, unit: piece, name: "tomatoes", notes: "large"
- `"Salt to taste"` → quantity: 1, unit: pinch, name: "salt", isOptional: true
- `"1 ½ cups flour"` → quantity: 1.5, unit: cup, name: "flour"

### 4. User Interface Design

#### 4.1 Recipe Form Enhancement
```typescript
interface EnhancedRecipeFormProps extends RecipeFormProps {
  showUrlImport?: boolean;
  onUrlImport?: (data: ScrapedRecipeData) => void;
}
```

#### 4.2 URL Import Modal/Section
- **Input Section**:
  - URL input field with validation
  - "Import Recipe" button
  - Loading spinner during scraping
  
- **Preview Section**:
  - Scraped recipe data preview
  - Editable fields for corrections
  - Ingredient mapping interface
  - Save/Cancel options

- **Error Handling**:
  - Clear error messages
  - Retry mechanism
  - Fallback to manual entry

#### 4.3 User Flow
1. User clicks "Import from URL" on recipe form
2. URL import section expands or modal opens
3. User enters recipe URL
4. System validates URL and shows loading state
5. Scraping occurs in background
6. Results displayed in preview mode
7. User can edit/correct extracted data
8. User confirms and data populates main form
9. User can make final edits before saving

### 5. Error Handling & Edge Cases

#### 5.1 Common Error Scenarios
- **Invalid URL**: Show validation error immediately
- **URL not accessible**: Network error handling
- **No recipe data found**: Graceful fallback message
- **Partial data extraction**: Show warnings, allow manual completion
- **CORS issues**: Clear explanation and alternative suggestions
- **Rate limiting**: Implement exponential backoff

#### 5.2 Fallback Strategies
- If structured data fails, attempt CSS selector parsing
- If ingredient parsing fails, preserve original text
- If timing extraction fails, leave fields empty for manual entry
- Always preserve source URL and name

### 6. Data Quality & Validation

#### 6.1 Data Validation Rules
- Recipe name: Required, max 200 characters
- Ingredients: At least one required
- Instructions: Required, max 10,000 characters
- Servings: Positive integer, default to 4 if not found
- Times: Validate format (e.g., "30 minutes", "1 hour 15 minutes")

#### 6.2 Data Normalization
- Convert ingredient quantities to decimal numbers
- Map extracted units to application's Unit enum
- Normalize ingredient names (lowercase, trim)
- Parse time durations to consistent format
- Extract and clean tags from categories

### 7. Testing Strategy

#### 7.1 Test Categories
- **Unit Tests**: Individual parsing functions
- **Integration Tests**: Full scraping pipeline
- **E2E Tests**: Complete user workflows
- **Cross-browser Tests**: Ensure compatibility

#### 7.2 Test Data Sources
- Popular recipe websites (AllRecipes, Food Network, BBC Good Food)
- Structured data examples from schema.org
- Edge cases (minimal data, malformed markup)
- Non-English content (if applicable)

## Implementation Checklist

### Phase 1: Core Infrastructure (Week 1)
- [ ] **Dependencies Setup**
  - [ ] Install required npm packages (cheerio, html parser)
  - [ ] Set up TypeScript types for scraping interfaces
  - [ ] Configure build process for new dependencies

- [ ] **Base Scraping Service**
  - [ ] Create `recipeScrapingService.ts` file
  - [ ] Implement URL validation utility
  - [ ] Create basic HTML fetching with CORS proxy
  - [ ] Add error handling and timeout logic
  - [ ] Create unit tests for utility functions

- [ ] **Structured Data Parser**
  - [ ] Implement JSON-LD parser for schema.org Recipe
  - [ ] Add Microdata parser support
  - [ ] Create RDFa parser (basic support)
  - [ ] Add tests for different structured data formats

### Phase 2: Data Processing (Week 2)
- [ ] **Ingredient Parsing Engine**
  - [ ] Create ingredient text parser with regex patterns
  - [ ] Implement quantity extraction (fractions, decimals, ranges)
  - [ ] Add unit normalization and mapping
  - [ ] Create ingredient name extraction logic
  - [ ] Handle optional ingredient detection
  - [ ] Add comprehensive test suite for parsing

- [ ] **Recipe Data Normalization**
  - [ ] Convert scraped data to application Recipe format
  - [ ] Handle missing or invalid data gracefully
  - [ ] Implement time duration parsing
  - [ ] Add tag extraction and normalization
  - [ ] Create data validation layer

- [ ] **Fallback HTML Parsing**
  - [ ] Implement CSS selector-based extraction
  - [ ] Add heuristic-based content detection
  - [ ] Create website-specific parsing rules
  - [ ] Handle common recipe website layouts

### Phase 3: User Interface (Week 3)
- [ ] **URL Import Component**
  - [ ] Create `RecipeUrlImport` component
  - [ ] Add URL input field with validation
  - [ ] Implement loading states and progress indicators
  - [ ] Create error display and retry mechanisms
  - [ ] Add accessibility features (ARIA labels, keyboard navigation)

- [ ] **Recipe Form Integration**
  - [ ] Modify existing `RecipeForm` component
  - [ ] Add "Import from URL" toggle/button
  - [ ] Integrate URL import section or modal
  - [ ] Handle data population from scraped results
  - [ ] Maintain existing manual entry workflow

- [ ] **Preview and Editing Interface**
  - [ ] Create scraped data preview component
  - [ ] Add inline editing for extracted fields
  - [ ] Implement ingredient mapping interface
  - [ ] Show warnings for missing or uncertain data
  - [ ] Add confirmation and cancel actions

### Phase 4: Testing & Polish (Week 4)
- [ ] **Comprehensive Testing**
  - [ ] Test with 20+ popular recipe websites
  - [ ] Verify structured data extraction accuracy
  - [ ] Test fallback parsing on sites without structured data
  - [ ] Validate ingredient parsing accuracy
  - [ ] Test error scenarios and edge cases

- [ ] **User Experience Refinement**
  - [ ] Add helpful tooltips and guidance
  - [ ] Implement smart defaults and suggestions
  - [ ] Optimize loading and response times
  - [ ] Add keyboard shortcuts for power users
  - [ ] Ensure mobile responsiveness

- [ ] **Error Handling & Documentation**
  - [ ] Create user-friendly error messages
  - [ ] Add help documentation for URL import
  - [ ] Implement analytics for import success rates
  - [ ] Create troubleshooting guide
  - [ ] Add CORS proxy fallback options

### Phase 5: Enhancement & Optimization (Week 5)
- [ ] **Advanced Features**
  - [ ] Add batch import for multiple URLs
  - [ ] Implement recipe website favorites/bookmarks
  - [ ] Add image import from scraped recipes
  - [ ] Create nutrition information extraction
  - [ ] Add recipe modification detection

- [ ] **Performance Optimization**
  - [ ] Implement caching for scraped data
  - [ ] Add request deduplication
  - [ ] Optimize bundle size and loading
  - [ ] Add progressive loading for large recipes
  - [ ] Implement background processing for slow sites

- [ ] **Quality Improvements**
  - [ ] Add user feedback mechanism for import quality
  - [ ] Implement machine learning for better parsing
  - [ ] Create custom parsing rules for popular sites
  - [ ] Add data accuracy scoring
  - [ ] Implement automatic retry with different strategies

## Success Metrics

### Technical Metrics
- **Import Success Rate**: >85% for popular recipe websites
- **Data Accuracy**: >90% for structured data sites, >70% for fallback parsing
- **Performance**: <5 seconds average import time
- **Error Rate**: <10% unrecoverable errors

### User Experience Metrics
- **Adoption Rate**: >40% of new recipes use URL import
- **User Satisfaction**: >4.5/5 rating for import feature
- **Time Saved**: 70% reduction in manual entry time
- **Retry Rate**: <20% of imports require retry

## Future Enhancements

### Short Term (1-3 months)
- Chrome extension for one-click import
- Mobile app integration
- Recipe website partnership program
- Community-driven parsing rules

### Long Term (6-12 months)
- AI-powered ingredient parsing
- OCR for recipe images
- Recipe modification tracking
- Social sharing and recipe discovery
- Multi-language support

## Risk Assessment

### Technical Risks
- **CORS Limitations**: May require proxy service or browser extension
- **Website Changes**: Recipe sites may change markup, breaking parsers
- **Rate Limiting**: Excessive requests may be blocked
- **Legal Concerns**: Scraping may violate terms of service

### Mitigation Strategies
- Multiple CORS proxy options and fallbacks
- Regular testing and parser updates
- Respectful crawling with delays
- Focus on public recipe content and attribution

## Conclusion

This feature will significantly enhance the Kitchen Pal application by reducing friction in recipe entry while maintaining data quality and user control. The phased implementation approach ensures steady progress while allowing for iterative improvements based on user feedback and technical learnings. 
# Recipe URL Import - Implementation Roadmap

## Quick Overview
Add ability to import recipes from URLs by scraping structured data from recipe websites and automatically populating the recipe form.

## Target Timeline: 5 Weeks

## Week 1: Foundation
### Dependencies & Setup
- [ ] Install packages: `cheerio`, `node-html-parser`, `recipe-schema-parser`
- [ ] Create TypeScript interfaces for scraping
- [ ] Set up CORS proxy solution

### Core Service
- [ ] Create `services/recipeScrapingService.ts`
- [ ] Implement URL validation
- [ ] Add HTML fetching with error handling
- [ ] Create JSON-LD parser for schema.org recipes

### Files to Create/Modify:
- `services/recipeScrapingService.ts` (new)
- `types.ts` (add scraping interfaces)
- `package.json` (add dependencies)

## Week 2: Data Processing
### Parsing Engine
- [ ] Build ingredient text parser
- [ ] Add quantity/unit extraction (handle fractions, ranges)
- [ ] Create recipe data normalization
- [ ] Add fallback CSS selector parsing

### Integration Points
- [ ] Map scraped data to existing Recipe interface
- [ ] Handle missing/invalid data gracefully
- [ ] Parse time durations to app format

### Files to Create/Modify:
- `utils/ingredientParser.ts` (new)
- `utils/timeParser.ts` (new)
- `services/recipeScrapingService.ts` (enhance)

## Week 3: User Interface
### URL Import Component
- [ ] Create `RecipeUrlImport` component
- [ ] Add URL input with validation
- [ ] Implement loading states
- [ ] Build preview interface for scraped data

### Form Integration
- [ ] Modify `RecipeForm` to include URL import
- [ ] Add "Import from URL" button/section
- [ ] Handle data population from scraping results
- [ ] Maintain existing manual entry workflow

### Files to Create/Modify:
- `components/RecipeUrlImport.tsx` (new)
- `App.tsx` (modify RecipeForm)
- `components.tsx` (add new UI components)

## Week 4: Testing & Polish
### Testing
- [ ] Test with 10+ popular recipe websites
- [ ] Verify ingredient parsing accuracy
- [ ] Test error scenarios
- [ ] Mobile responsiveness check

### UX Improvements
- [ ] Add helpful error messages
- [ ] Implement retry mechanisms
- [ ] Add loading indicators
- [ ] Create user guidance/tooltips

### Files to Create/Modify:
- `__tests__/recipeScrapingService.test.ts` (new)
- `constants.tsx` (add error messages)

## Week 5: Enhancement
### Advanced Features
- [ ] Add image scraping/import
- [ ] Implement better error recovery
- [ ] Add success/failure metrics tracking
- [ ] Performance optimization

### Documentation
- [ ] User guide for URL import
- [ ] Troubleshooting documentation
- [ ] Update README with new feature

## Technical Architecture Summary

### New Services
```
services/
├── recipeScrapingService.ts    # Main scraping logic
└── corsProxyService.ts         # Handle CORS issues

utils/
├── ingredientParser.ts         # Parse ingredient text
├── timeParser.ts              # Parse duration strings
└── recipeNormalizer.ts        # Convert scraped → Recipe format

components/
├── RecipeUrlImport.tsx        # URL import UI
├── ScrapedDataPreview.tsx     # Preview scraped data
└── IngredientMappingTable.tsx # Map scraped ingredients
```

### Key Interfaces
```typescript
interface ScrapedRecipeData {
  name: string;
  ingredients: ScrapedIngredient[];
  instructions: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  sourceUrl: string;
  sourceName?: string;
  tags?: string[];
}

interface RecipeScrapingResult {
  success: boolean;
  data?: ScrapedRecipeData;
  error?: string;
  warnings?: string[];
}
```

## Implementation Priority

### Must Have (MVP)
1. URL input and validation
2. JSON-LD structured data parsing
3. Basic ingredient text parsing
4. Recipe form population
5. Error handling

### Should Have
1. Fallback HTML parsing
2. Image import
3. Preview interface
4. Data editing before save

### Could Have
1. Batch import
2. Favorite sites
3. Custom parsing rules
4. Analytics/metrics

## CORS Solutions

### Option 1: Public Proxy (Recommended for MVP)
- Use `allorigins.win` or similar
- Quick implementation
- May have rate limits

### Option 2: Own Proxy Server
- Deploy simple Node.js proxy
- Better control and reliability
- Requires hosting

### Option 3: Browser Extension
- Manifest V3 extension
- No CORS issues
- Requires user installation

## Testing Strategy

### Manual Testing Sites
- [ ] AllRecipes.com
- [ ] Food Network
- [ ] BBC Good Food
- [ ] Epicurious
- [ ] Serious Eats
- [ ] NYT Cooking (if accessible)
- [ ] King Arthur Baking
- [ ] Bon Appétit

### Automated Tests
- [ ] URL validation
- [ ] JSON-LD parsing
- [ ] Ingredient parsing accuracy
- [ ] Error handling
- [ ] Data normalization

## Risk Mitigation

### Technical Risks
- **CORS blocking**: Multiple proxy fallbacks
- **Site structure changes**: Regular testing + graceful failures
- **Rate limiting**: Respectful delays + retry logic

### Legal/Ethical
- **ToS violations**: Focus on public recipe content
- **Attribution**: Always preserve source URL + name
- **Fair use**: Educational/personal use emphasis

## Success Criteria

### Technical
- [ ] 80%+ successful imports from top 10 recipe sites
- [ ] <5 second average import time
- [ ] Graceful error handling with useful messages

### User Experience  
- [ ] Intuitive import flow
- [ ] Clear preview of imported data
- [ ] Easy correction of parsing errors
- [ ] Seamless integration with existing form

## Next Steps After Implementation

1. **User Feedback Collection**: Add rating/feedback for imports
2. **Analytics**: Track success rates and common failures  
3. **Community Rules**: Allow users to submit parsing improvements
4. **Mobile App**: Extend to mobile version
5. **API Partnership**: Work with recipe sites for official APIs 
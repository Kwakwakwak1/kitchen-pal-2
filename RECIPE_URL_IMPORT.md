# Recipe URL Import Feature

## Overview

The Recipe URL Import feature allows users to automatically import recipes from cooking websites by simply providing a URL. The system extracts recipe data from structured markup (JSON-LD, Microdata) and populates the recipe form automatically.

## Setup for Development

### Option 1: Using Local Proxy Server (Recommended)

To bypass CORS issues during development, you can run a local proxy server:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run with Local Proxy**:
   ```bash
   npm run dev:with-proxy
   ```
   
   This will start both the Vite development server and a local proxy server on port 3001.

3. **Alternative - Manual Setup**:
   ```bash
   # Terminal 1: Start the proxy server
   npm run proxy
   
   # Terminal 2: Start the dev server
   npm run dev
   ```

### Option 2: Using Public CORS Proxies

If you prefer not to run a local proxy, the app will automatically try several public CORS proxy services:

- api.allorigins.win
- corsproxy.io
- cors.bridged.cc
- thingproxy.freeboard.io
- api.codetabs.com
- cors-proxy.htmldriven.com

Note: Public proxies may have rate limits or occasional downtime.

## How to Use

1. **Open the Recipe Form**: Click "Add New Recipe" in the Recipes section
2. **Choose Import Method**: Toggle between "Manual Entry" and "Import from URL"
3. **Enter Recipe URL**: Paste the URL of any recipe page from popular cooking websites
4. **Click Import**: The system will scrape and parse the recipe data
5. **Review & Edit**: Preview the imported data and make any necessary adjustments
6. **Save Recipe**: Confirm the import to add the recipe to your collection

## Supported Websites

The import feature works best with websites that use structured data markup, including:

- AllRecipes.com
- Food Network
- BBC Good Food
- Serious Eats
- King Arthur Baking
- Bon Appétit
- Epicurious
- And many other recipe websites that follow schema.org standards

## Features

### Automatic Data Extraction

- **Recipe Name**: Automatically extracted from page title or structured data
- **Ingredients**: Parsed with intelligent quantity, unit, and name detection
- **Instructions**: Step-by-step directions imported and formatted
- **Timing**: Prep time, cook time, and total time extracted
- **Servings**: Recipe yield/servings information
- **Source Attribution**: Website name and URL automatically preserved
- **Tags**: Recipe categories when available

### Intelligent Ingredient Parsing

The system can parse complex ingredient formats:

- **Quantities**: Handles fractions (1/2, ¾), decimals (1.5), and ranges (2-3)
- **Units**: Recognizes cups, tablespoons, teaspoons, ounces, pounds, grams, etc.
- **Optional Ingredients**: Detects "optional", "to taste", "for garnish" annotations
- **Preparation Notes**: Extracts notes like "chopped", "diced", "fresh" from ingredient text

### Smart Error Handling

- **URL Validation**: Checks URL format before attempting to scrape
- **Fallback Parsing**: If structured data isn't available, tries CSS selector-based extraction
- **CORS Proxy**: Handles cross-origin restrictions using multiple proxy services
- **User-Friendly Errors**: Clear error messages with retry options

## Technical Implementation

### Data Sources

1. **JSON-LD Structured Data** (Primary): Modern recipe websites use schema.org Recipe format
2. **Microdata** (Secondary): Older structured markup format
3. **CSS Selectors** (Fallback): Common recipe page element patterns

### Dependencies

- `cheerio`: Server-side HTML parsing
- `node-html-parser`: Lightweight HTML manipulation
- CORS proxy services for cross-origin requests

### Architecture

```
User Input (URL) 
    ↓
URL Validation
    ↓
HTML Content Fetch (via CORS proxy)
    ↓
Structured Data Extraction (JSON-LD, Microdata)
    ↓
Fallback HTML Parsing (if needed)
    ↓
Ingredient Text Parsing
    ↓
Data Normalization
    ↓
Form Population
```

## Testing

### Test with Sample Recipe

A test recipe page is included at `test-scraping.html` with proper schema.org markup for testing the import functionality locally.

### Manual Testing

Try importing from these reliable sources:
- https://www.allrecipes.com/recipe/23600/worlds-best-lasagna/
- https://www.foodnetwork.com/recipes/alton-brown/good-eats-meatloaf-recipe-1937667
- https://www.bbcgoodfood.com/recipes/classic-victoria-sponge

## Troubleshooting

### Common Issues

1. **"No recipe data found"**
   - The website may not use structured data markup
   - Try a different recipe from the same site
   - Some sites block automated scraping

2. **CORS errors**
   - The proxy service may be temporarily unavailable
   - Try again in a few minutes
   - The feature will attempt multiple proxy services automatically

3. **Incomplete data**
   - Some recipe sites only provide partial structured data
   - You can manually edit any field after import
   - Missing data is highlighted in the preview

4. **Ingredient parsing issues**
   - Complex ingredient formats may not parse perfectly
   - Review and adjust quantities/units in the form
   - Original text is preserved for reference

### Tips for Best Results

- Use recipe URLs from the main recipe page (not print or AMP versions)
- Popular cooking websites generally have better structured data
- Preview all imported data before saving
- Keep original URL for attribution and future reference

## Privacy & Ethics

- Only public recipe content is accessed
- Source attribution is always preserved
- No personal data is collected from recipe websites
- Respects robots.txt and rate limiting where applicable

## Future Enhancements

Planned improvements include:
- Better ingredient parsing with AI assistance
- Image import from recipe pages
- Batch import for multiple recipes
- Custom parsing rules for specific websites
- Mobile app integration
- Browser extension for one-click importing 
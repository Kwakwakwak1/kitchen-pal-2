# Kitchen Pal - Recipe Management App

A comprehensive web application for managing recipes, inventory, and shopping lists with an innovative **Recipe URL Import** feature.

## ✨ Features

### 🆕 Recipe URL Import
- **Automatically import recipes** from any cooking website by just providing a URL
- **Smart parsing** of ingredients, instructions, timing, and metadata
- **Supports popular sites** like AllRecipes, Food Network, BBC Good Food, and more
- **Intelligent ingredient parsing** with quantity, unit, and name detection
- See [RECIPE_URL_IMPORT.md](RECIPE_URL_IMPORT.md) for detailed documentation

### 📝 Recipe Management
- Create, edit, and organize your recipe collection
- Manual entry or automatic import from URLs
- Ingredient quantities with unit conversion
- Prep/cook time tracking and tags

### 📦 Inventory Tracking
- Monitor ingredient stock levels
- Low stock alerts and expiration tracking
- Frequency of use patterns

### 🛒 Smart Shopping Lists
- Auto-generate shopping lists from selected recipes
- Track purchase status and store preferences
- Inventory integration to avoid duplicate purchases

### 👤 User Profiles
- Personal recipe collections
- Preference settings and measurement systems
- Secure local storage

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`

## Recipe URL Import Usage

1. Click "Add New Recipe" in the Recipes section
2. Toggle to "Import from URL" 
3. Paste any recipe URL from popular cooking websites
4. Review the automatically extracted data
5. Save to your recipe collection

Try it with sample URLs like:
- https://www.allrecipes.com/recipe/23600/worlds-best-lasagna/
- https://www.foodnetwork.com/recipes/alton-brown/good-eats-meatloaf-recipe-1937667

## Technical Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Data**: Local Storage
- **Recipe Scraping**: Cheerio + node-html-parser
- **Build**: Vite

## Development

The app uses a modern React architecture with:
- Context API for state management
- TypeScript for type safety
- Component-based architecture
- Responsive design patterns

For detailed information about the Recipe URL Import feature, see [RECIPE_URL_IMPORT.md](RECIPE_URL_IMPORT.md).

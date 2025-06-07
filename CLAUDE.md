# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
```bash
npm install              # Install dependencies
npm run dev             # Start development server (port 5173)
npm run dev:with-proxy  # Start dev server with local CORS proxy
npm run proxy           # Run only the local proxy server (port 3001)
```

### Build & Production
```bash
npm run build           # Build for production
npm run preview         # Preview production build
```

### Docker Development
```bash
npm run docker:build   # Build Docker containers
npm run docker:up      # Start containers in background
npm run docker:down    # Stop containers
npm run docker:logs    # View container logs
npm run docker:restart # Restart containers
npm run docker:clean   # Clean containers and volumes
```

## Architecture Overview

### Technology Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (utility classes throughout components)
- **Routing**: React Router DOM
- **State Management**: React Context API with 6 main providers
- **Data Persistence**: localStorage (user-scoped data)
- **Build Tool**: Vite with TypeScript and path aliases (`@/*`)

### Core Application Structure

#### State Management Pattern
The app uses a **Context + Provider architecture** with these main providers:
- `AuthProvider` - User authentication and profiles
- `RecipesProvider` - Recipe CRUD operations  
- `InventoryProvider` - Inventory management with unit conversion
- `StoresProvider` - Store management
- `ShoppingListsProvider` - Shopping list operations with archiving
- `AppStateProvider` - Global UI state and navigation

#### Data Flow
```
Component → Hook → Context → Provider → localStorage
```

All data is **user-scoped** with localStorage keys like `recipes_{userId}`, `inventory_{userId}`, etc.

#### Key Files
- `App.tsx` (2000+ lines) - Main application with all page components
- `types.ts` - Comprehensive TypeScript interfaces for all entities
- `components.tsx` - Reusable UI component library
- `constants.tsx` - Utilities, unit conversion, ID generation
- `localStorageService.ts` - Type-safe localStorage operations

### Component Organization
The project recently restructured from a monolithic App.tsx to organized page structure:
- `src/pages/` - All page components organized by domain
- `src/components/` - Reusable components and UI elements
- `src/providers/` - Context providers for state management
- `src/services/` - Business logic and external services

### Recipe URL Import Feature
- Uses `services/recipeScrapingService.ts` for web scraping
- Supports local proxy server (`local-proxy-server.js`) to bypass CORS
- Parses structured data (JSON-LD, Microdata) from recipe websites
- Includes intelligent ingredient parsing with units and quantities

## Development Patterns

### TypeScript Usage
- Strict TypeScript configuration with comprehensive interfaces
- All providers and hooks are fully typed
- Use existing `Unit` enum for measurements
- Follow the established context pattern for new features

### Component Patterns
- Use existing UI components from `components.tsx` (Button, Modal, Card, etc.)
- Follow Tailwind CSS utility-first approach
- Implement responsive design with mobile-first approach
- Use the established form patterns (InputField, SelectField, etc.)

### Data Management
- All state changes auto-persist to localStorage
- User authentication required for data access
- Use provided utility functions for unit conversion and ingredient normalization
- Follow user-scoped data pattern for new features

### Code Conventions
- Use the existing ID generation pattern from `constants.tsx`
- Follow established naming conventions for localStorage keys
- Use provided icon components from the constants file
- Implement proper error handling and loading states

## Important Notes

### Authentication
- Currently uses simple email/password with plaintext storage (development only)
- Data is segregated by user ID across the application
- All providers handle user authentication state

### CORS Handling
- Recipe URL import requires proxy server for development
- Local proxy runs on port 3001, configured in `vite.config.ts`
- Public CORS proxies available as fallback

### Path Aliases
- Use `@/*` imports (configured in tsconfig.json and vite.config.ts)
- Examples: `@/types`, `@/components/Button`, `@/utils/hooks`

### Environment Variables
- `GEMINI_API_KEY` - Required for AI-powered features
- Configured in vite.config.ts for build-time injection

## Testing & Quality

Currently no test framework is configured. When adding tests, check the existing codebase patterns and ask the user for preferred testing approach.

For type checking, the TypeScript compiler serves as the primary validation tool with strict configuration enabled.
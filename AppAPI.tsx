import React, { useState, ReactElement } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { QueryProvider } from './src/providers/QueryProvider';
import { AuthProviderAPI } from './src/providers/AuthProviderAPI';
import { StoresProviderAPI } from './src/providers/StoresProviderAPI';
import { ShoppingListsProviderAPI } from './src/providers/ShoppingListsProviderAPI';
import { RecipesProviderAPI } from './src/providers/RecipesProviderAPI';
import { InventoryProviderAPI } from './src/providers/InventoryProviderAPI';
import { AppStateProvider } from './src/providers/AppStateProvider';

// Import all the same pages and components as App.tsx
import LoginPageAPI from './src/pages/auth/LoginPageAPI';
import SignupPageAPI from './src/pages/auth/SignupPageAPI';
import EmailVerificationPage from './src/pages/auth/EmailVerificationPage';
import DashboardPage from './src/pages/dashboard/DashboardPage';
import ProfilePage from './src/pages/auth/ProfilePage';
import StoresPage from './src/pages/stores/StoresPage';
import { ShoppingListDetailPage } from './src/pages/ShoppingListDetailPage';
import AdminDashboardPage from './src/pages/admin/AdminDashboardPage';
import ProtectedRoute from './src/components/shared/ProtectedRoute';

// Import UI components and utilities
import { Button, SearchInput } from './components';
import { APP_NAME, DEFAULT_AVATAR_IMAGE } from './constants';
import { 
  BookOpenIcon, ArchiveBoxIcon, ShoppingCartIcon, BuildingStorefrontIcon,
  ArrowRightOnRectangleIcon, UserPlusIcon, ArrowLeftOnRectangleIcon,
  UserCircleIcon, CubeTransparentIcon
} from './constants';
import { ActiveView } from './types';

// Import hooks from API providers
import { useAuth } from './src/providers/AuthProviderAPI';
import { useAppState } from './src/providers/AppStateProvider';

// TODO: Import these pages when they're converted to work with API providers
// import RecipesPage from './src/pages/recipes/RecipesPage';
// import RecipeDetailPage from './src/pages/recipes/RecipeDetailPage';
// import InventoryPage from './src/pages/inventory/InventoryPage';
// import ShoppingListsPage from './src/pages/shopping-lists/ShoppingListsPage';
// import ShoppingListGeneratorPage from './src/pages/shopping-lists/ShoppingListGeneratorPage';

// Temporary placeholder pages until we convert the main pages
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="container mx-auto p-4">
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{title}</h1>
      <p className="text-gray-600 mb-6">This page is being converted to work with the API backend.</p>
      <p className="text-sm text-gray-500">Coming soon...</p>
    </div>
  </div>
);

// AppLayout component - mirrors the one from App.tsx but for API version
const AppLayoutAPI: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use proper hooks from API providers
  const { currentUser, logout, isLoadingAuth } = useAuth();
  const { activeView, setActiveView, searchTerm, setSearchTerm } = useAppState();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ view: ActiveView; label: string; icon: ReactElement<{ className?: string }> }> = [
    { view: 'dashboard', label: 'Dashboard', icon: <CubeTransparentIcon /> },
    { view: 'recipes', label: 'Recipes', icon: <BookOpenIcon /> },
    { view: 'inventory', label: 'Inventory', icon: <ArchiveBoxIcon /> },
    { view: 'shopping_lists', label: 'Shopping Lists', icon: <ShoppingCartIcon /> },
    { view: 'stores', label: 'Stores', icon: <BuildingStorefrontIcon /> },
  ];

  const showSearchBar = currentUser && ['recipes', 'inventory', 'shopping_lists', 'stores', 'generate_shopping_list'].includes(activeView);

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-lg text-gray-600">Loading Kitchen Pal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={currentUser ? "/dashboard" : "/login"} className="flex items-center">
              <img src="/images/kitchen-pal-logo-spoon-1.png" alt="Kitchen Pal Spoon" className="h-10 w-auto mr-2" />
              <img src="/images/kitchen-pal-logo-text.png" alt="Kitchen Pal" className="h-8 w-auto" />
            </Link>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-1">
              {currentUser ? (
                <>
                  {navItems.map(item => (
                    <Link
                      key={item.view}
                      to={`/${item.view}`}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2
                        ${activeView.startsWith(item.view) ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                    >
                      {React.cloneElement(item.icon, { className: "w-5 h-5" })}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <div className="relative group">
                     <button 
                        onClick={() => setActiveView('profile')}
                        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="User Profile"
                      >
                       <img 
                          src={DEFAULT_AVATAR_IMAGE} 
                          alt="User Avatar" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                     </button>
                  </div>
                   <Button onClick={() => { logout(); setMobileMenuOpen(false); }} variant="ghost" size="sm" leftIcon={<ArrowLeftOnRectangleIcon className="w-5 h-5"/>}>
                      Logout
                    </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex items-center space-x-2"><ArrowRightOnRectangleIcon className="w-5 h-5"/><span>Login</span></Link>
                  <Link to="/signup" className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex items-center space-x-2"><UserPlusIcon className="w-5 h-5"/><span>Sign Up</span></Link>
                </>
              )}
              {showSearchBar && (
                <div className="w-full md:w-64 lg:w-80 ml-4">
                  <SearchInput 
                    value={searchTerm} 
                    onChange={setSearchTerm} 
                    placeholder={`Search ${activeView.replace(/_/g, ' ').replace('detail', '')}...`}
                  />
                </div>
              )}
            </div>
            
            {/* Mobile Menu Button & Search (if applicable) */}
            <div className="md:hidden flex items-center"> 
               {showSearchBar && !mobileMenuOpen && (
                <div className="w-auto mr-2"> 
                   <SearchInput 
                    value={searchTerm} 
                    onChange={setSearchTerm} 
                    placeholder="Search..."
                  />
                </div>
              )}
               <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-500 hover:text-gray-700 focus:outline-none p-2" aria-label="Open mobile menu" aria-expanded={mobileMenuOpen}>
                 {mobileMenuOpen ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 ) : (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                 )}
               </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white shadow-lg">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {currentUser && showSearchBar && (
                 <div className="p-2">
                    <SearchInput 
                      value={searchTerm} 
                      onChange={setSearchTerm} 
                      placeholder={`Search ${activeView.replace(/_/g, ' ').replace('detail', '')}...`}
                    />
                  </div>
              )}
              {currentUser ? (
                <>
                  {navItems.map(item => (
                      <Link
                        key={`mobile-${item.view}`}
                        to={`/${item.view}`}
                        className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 
                        ${activeView.startsWith(item.view) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                      >
                        {React.cloneElement(item.icon, { className: "w-5 h-5" })}
                        <span>{item.label}</span>
                      </Link>
                  ))}
                  <Link
                    to="/profile"
                    className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 
                    ${activeView === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                   <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                 <>
                  <Link to="/login" className="block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"><ArrowRightOnRectangleIcon className="w-5 h-5"/><span>Login</span></Link>
                  <Link to="/signup" className="block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"><UserPlusIcon className="w-5 h-5"/><span>Sign Up</span></Link>
                </>
              )}
              </div>
          </div>
        )}
      </nav>
      
      <main className="flex-grow container mx-auto py-4 sm:py-8 px-2 sm:px-4">
        <Routes>
          <Route path="/login" element={<LoginPageAPI />} />
          <Route path="/signup" element={<SignupPageAPI />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/recipes" element={<ProtectedRoute><PlaceholderPage title="Recipes" /></ProtectedRoute>} />
          <Route path="/recipe_detail/:id" element={<ProtectedRoute><PlaceholderPage title="Recipe Detail" /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><PlaceholderPage title="Inventory" /></ProtectedRoute>} />
          <Route path="/shopping_lists" element={<ProtectedRoute><PlaceholderPage title="Shopping Lists" /></ProtectedRoute>} />
          <Route path="/shopping_list_detail/:id" element={<ProtectedRoute><ShoppingListDetailPage /></ProtectedRoute>} />
          <Route path="/generate_shopping_list" element={<ProtectedRoute><PlaceholderPage title="Generate Shopping List" /></ProtectedRoute>} />
          <Route path="/stores" element={<ProtectedRoute><StoresPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminDashboardPage /></ProtectedRoute>} />
          
          {/* Default redirect - goes to login if not authenticated */}
          <Route path="*" element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} /> 
        </Routes>
      </main>
      
      <footer className="bg-white border-t border-gray-200 text-center p-4 text-sm text-gray-500">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </footer>
    </div>
  );
};

// Always provide all providers to avoid hook errors
const AuthenticatedProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <StoresProviderAPI>
      <ShoppingListsProviderAPI>
        <RecipesProviderAPI>
          <InventoryProviderAPI>
            {children}
          </InventoryProviderAPI>
        </RecipesProviderAPI>
      </ShoppingListsProviderAPI>
    </StoresProviderAPI>
  );
};

const AppAPI: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProviderAPI>
        <AppStateProvider>
          <Router>
            <AuthenticatedProviders>
              <AppLayoutAPI />
            </AuthenticatedProviders>
          </Router>
        </AppStateProvider>
      </AuthProviderAPI>
    </QueryProvider>
  );
};

export default AppAPI;
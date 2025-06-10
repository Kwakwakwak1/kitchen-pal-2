import { parse } from 'node-html-parser';
import type { RecipeScrapingResult, ScrapedRecipeData, ScrapedIngredient } from '../types';

// Determine if we're in development mode based on hostname
const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// CORS Proxy options - prioritize production and local proxies
const CORS_PROXIES = [
  // Production proxy (highest priority in production)
  ...(!isDev && typeof window !== 'undefined' ? [window.location.origin + '/recipe-proxy?url='] : []),
  
  // Local development proxy (if running) - highest priority in dev
  ...(isDev ? ['http://localhost:3001/recipe-proxy?url='] : []),
  
  // Most reliable public proxies as fallback
  'https://api.allorigins.win/get?url=',
  'https://cors-proxy.htmldriven.com/?url=',
  
  // Backup proxies
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  
  // Additional fallbacks (may have limitations)
  'https://thingproxy.freeboard.io/fetch/',
  'https://cors.bridged.cc/',
  
  // Note: cors-anywhere.herokuapp.com requires demo key and has daily limits
  // 'https://cors-anywhere.herokuapp.com/',
];

/**
 * Validates if a URL is properly formatted and likely to be a recipe URL
 */
export function validateRecipeUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);
    
    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    
    // Should have a valid hostname
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      return { isValid: false, error: 'Invalid URL hostname' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Fetches HTML content from a URL using a CORS proxy with enhanced error handling
 */
async function fetchHtmlContent(url: string): Promise<{ html: string; finalUrl: string }> {
  let lastError: Error | null = null;
  const proxiesAttempted: string[] = [];
  
  // Debug: Log browser info and available proxies
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
  console.log(`🌐 Browser: ${isSafari ? 'Safari' : 'Chrome/Other'}`);
  console.log(`📋 Available proxies: ${CORS_PROXIES.length}`);
  console.log(`🎯 Target URL: ${url}`);
  console.log(`🔍 Full User Agent: ${userAgent}`);
  
  // Try each CORS proxy
  for (const proxy of CORS_PROXIES) {
    try {
      let proxyUrl: string;
      
      // Create Safari-compatible timeout signal
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 20000); // 20 second timeout
      
      let fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/html, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        },
        // Use AbortController for Safari compatibility
        signal: abortController.signal
      };

      // Handle different proxy URL formats
      if (proxy.includes('allorigins.win')) {
        proxyUrl = proxy + encodeURIComponent(url);
      } else if (proxy.includes('localhost:3001')) {
        proxyUrl = proxy + encodeURIComponent(url);
      } else if (proxy.includes('corsproxy.io')) {
        proxyUrl = proxy + encodeURIComponent(url);
      } else if (proxy.includes('cors.bridged.cc')) {
        proxyUrl = proxy + encodeURIComponent(url);
      } else if (proxy.includes('thingproxy.freeboard.io')) {
        proxyUrl = proxy + encodeURIComponent(url);
      } else if (proxy.includes('codetabs.com')) {
        proxyUrl = proxy + encodeURIComponent(url);
      } else if (proxy.includes('htmldriven.com')) {
        proxyUrl = proxy + encodeURIComponent(url);
      } else {
        proxyUrl = proxy + encodeURIComponent(url);
      }
      
            const proxyName = proxy.split('?')[0].split('/').pop() || proxy.split('?')[0];
      proxiesAttempted.push(proxyName);
      console.log(`🔄 Trying proxy: ${proxyName} for URL: ${url}`);
      console.log(`📡 Fetch URL: ${proxyUrl}`);
      console.log(`⚙️ Fetch options:`, fetchOptions);
      
      console.log(`🚀 Starting fetch request...`);
      const response = await fetch(proxyUrl, fetchOptions);
      console.log(`✅ Fetch completed with status: ${response.status}`);
      
      // Clear timeout since request succeeded
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        // Add context for common errors
        if (response.status === 403) {
          errorMessage += ' - The target website may be blocking requests';
        } else if (response.status === 404) {
          errorMessage += ' - Recipe page not found';
        } else if (response.status === 429) {
          errorMessage += ' - Rate limited by proxy or target site';
        } else if (response.status >= 500) {
          errorMessage += ' - Server error at target website';
        }
        
        throw new Error(errorMessage);
      }
      
      let html: string;
      
      // Handle different response formats
      const contentType = response.headers.get('content-type') || '';
      
      if (proxy.includes('allorigins.win')) {
        const data = await response.json();
        if (!data.contents) {
          throw new Error('No content returned from allorigins proxy - website may be blocking requests');
        }
        html = data.contents;
      } else if (proxy.includes('localhost:3001') || proxy.includes('/recipe-proxy')) {
        const data = await response.json();
        if (!data.success) {
          const errorMsg = data.error || 'Unknown error from local proxy';
          throw new Error(`Local proxy error: ${errorMsg}`);
        }
        if (!data.html) {
          throw new Error('No HTML content returned from local proxy');
        }
        html = data.html;
      } else if (contentType.includes('application/json')) {
        // Some proxies return JSON-wrapped responses
        try {
          const data = await response.json();
          html = data.contents || data.data || data.body || data;
          if (typeof html !== 'string') {
            html = await response.text();
          }
        } catch {
          html = await response.text();
        }
      } else {
        html = await response.text();
      }
      
      if (!html || html.trim().length < 100) {
        throw new Error('Received empty or very short response - website may be blocking requests or page may not exist');
      }
      
      // Basic check for blocked content
      if (html.includes('Access Denied') || 
          html.includes('Forbidden') || 
          html.includes('blocked') ||
          html.includes('Cloudflare')) {
        throw new Error('Website is blocking automated access');
      }
      
              console.log(`Successfully fetched content via ${proxyName} (${html.length} characters)`);
        return { html, finalUrl: url };
        
      } catch (error) {
      lastError = error as Error;
      const proxyName = proxy.split('?')[0].split('/').pop() || proxy.split('?')[0];
      console.warn(`Failed to fetch via proxy ${proxyName}:`, (error as Error).message);
      
      // If it's a timeout or abort error, mention it specifically
      if ((error as Error).name === 'AbortError' || (error as Error).message.includes('timeout')) {
        lastError = new Error(`Request timed out via ${proxyName} - website may be slow or unreachable`);
      }
      
      continue;
    }
  }
  
  // Enhanced error message with more context
  const attemptedList = proxiesAttempted.length > 0 ? ` (tried: ${proxiesAttempted.join(', ')})` : '';
  let finalError = `Failed to fetch URL with all available proxies${attemptedList}.`;
  
  if (lastError) {
    if (lastError.message.includes('timeout')) {
      finalError += ' The website may be slow or temporarily unavailable. Please try again in a few minutes.';
    } else if (lastError.message.includes('Access') || lastError.message.includes('blocked')) {
      finalError += ' The website appears to be blocking automated requests. Try copying the recipe manually or use a different recipe source.';
    } else if (lastError.message.includes('404') || lastError.message.includes('not found')) {
      finalError += ' The recipe page was not found. Please check the URL is correct and points to a recipe page.';
    } else {
      finalError += ` Last error: ${lastError.message}`;
    }
  }
  
  finalError += ' Please check your internet connection or try a different recipe URL.';
  
  throw new Error(finalError);
}

/**
 * Extracts recipe data from JSON-LD structured data with enhanced parsing
 */
function extractJsonLdRecipe(html: string, sourceUrl: string): ScrapedRecipeData | null {
  const root = parse(html);
  const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');
  
  for (const script of jsonLdScripts) {
    try {
      const jsonContent = script.innerHTML.trim();
      if (!jsonContent) continue;
      
      const data = JSON.parse(jsonContent);
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        let recipe = null;
        
        // Handle different JSON-LD structures
        if (item['@type'] === 'Recipe') {
          recipe = item;
        } else if (item['@graph']) {
          // Handle @graph arrays (common in WordPress sites)
          recipe = item['@graph'].find((g: any) => g['@type'] === 'Recipe');
        } else if (item.mainEntity && item.mainEntity['@type'] === 'Recipe') {
          // Handle mainEntity structure
          recipe = item.mainEntity;
        } else if (Array.isArray(item['@type']) && item['@type'].includes('Recipe')) {
          // Handle arrays of types
          recipe = item;
        }
        
        // Sometimes recipe data is nested deeper
        if (!recipe && item.about && item.about['@type'] === 'Recipe') {
          recipe = item.about;
        }
        
        // Check for recipe in nested objects
        if (!recipe) {
          const findRecipe = (obj: any): any => {
            if (typeof obj !== 'object' || obj === null) return null;
            
            if (obj['@type'] === 'Recipe') return obj;
            
            for (const [_key, value] of Object.entries(obj)) {
              if (typeof value === 'object' && value !== null) {
                const found = findRecipe(value);
                if (found) return found;
              }
            }
            return null;
          };
          
          recipe = findRecipe(item);
        }
        
        if (recipe && (recipe['@type'] === 'Recipe' || 
                      (Array.isArray(recipe['@type']) && recipe['@type'].includes('Recipe')))) {
          console.log('Found recipe in JSON-LD structured data');
          return parseRecipeFromJsonLd(recipe, sourceUrl);
        }
      }
    } catch (error) {
      console.warn('Failed to parse JSON-LD script:', error);
      continue;
    }
  }
  
  // If no JSON-LD found, also check for Microdata
  return extractMicrodataRecipe(html, sourceUrl);
}

/**
 * Extracts recipe data from Microdata (fallback for older sites)
 */
function extractMicrodataRecipe(html: string, sourceUrl: string): ScrapedRecipeData | null {
  const root = parse(html);
  
  // Look for microdata recipe
  const recipeElements = root.querySelectorAll('[itemtype*="Recipe"]');
  
  for (const element of recipeElements) {
    try {
      const recipe: any = {};
      
      // Extract basic properties
      const name = element.querySelector('[itemprop="name"]')?.text?.trim();
      if (name) recipe.name = name;
      
      // Extract ingredients
      const ingredientElements = element.querySelectorAll('[itemprop="recipeIngredient"]');
      if (ingredientElements.length > 0) {
        recipe.recipeIngredient = ingredientElements.map(el => el.text?.trim()).filter(Boolean);
      }
      
      // Extract instructions
      const instructionElements = element.querySelectorAll('[itemprop="recipeInstructions"]');
      if (instructionElements.length > 0) {
        recipe.recipeInstructions = instructionElements.map(el => el.text?.trim()).filter(Boolean);
      }
      
      // Extract times
      const prepTime = element.querySelector('[itemprop="prepTime"]')?.getAttribute('datetime') ||
                      element.querySelector('[itemprop="prepTime"]')?.text?.trim();
      if (prepTime) recipe.prepTime = prepTime;
      
      const cookTime = element.querySelector('[itemprop="cookTime"]')?.getAttribute('datetime') ||
                      element.querySelector('[itemprop="cookTime"]')?.text?.trim();
      if (cookTime) recipe.cookTime = cookTime;
      
      const totalTime = element.querySelector('[itemprop="totalTime"]')?.getAttribute('datetime') ||
                       element.querySelector('[itemprop="totalTime"]')?.text?.trim();
      if (totalTime) recipe.totalTime = totalTime;
      
      // Extract yield/servings
      const yield_ = element.querySelector('[itemprop="recipeYield"]')?.text?.trim();
      if (yield_) recipe.recipeYield = yield_;
      
      // Extract description
      const description = element.querySelector('[itemprop="description"]')?.text?.trim();
      if (description) recipe.description = description;
      
      // If we have enough data, parse it
      if (recipe.name && (recipe.recipeIngredient || recipe.recipeInstructions)) {
        console.log('Found recipe in Microdata');
        return parseRecipeFromJsonLd(recipe, sourceUrl);
      }
    } catch (error) {
      console.warn('Failed to parse Microdata recipe:', error);
      continue;
    }
  }
  
  return null;
}

/**
 * Parses a recipe object from JSON-LD data
 */
function parseRecipeFromJsonLd(recipe: any, sourceUrl: string): ScrapedRecipeData {
  // Helper function to extract text from various formats
  const extractText = (value: any): string => {
    if (typeof value === 'string') return value;
    if (value?.['@value']) return value['@value'];
    if (value?.text) return value.text;
    if (value?.name) return value.name;
    if (Array.isArray(value)) return value.map(extractText).join(', ');
    return String(value || '');
  };

  // Helper function to extract duration in minutes
  const extractDuration = (duration: any): string | undefined => {
    if (!duration) return undefined;
    if (typeof duration === 'string') {
      // Handle ISO 8601 duration format (PT30M, PT1H30M)
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (match) {
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const totalMinutes = hours * 60 + minutes;
        if (hours > 0) {
          return `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minutes` : ''}`;
        } else {
          return `${totalMinutes} minutes`;
        }
      }
      return duration;
    }
    return extractText(duration);
  };

  // Extract ingredients
  const ingredients: ScrapedIngredient[] = [];
  const recipeIngredients = recipe.recipeIngredient || [];
  
  for (const ing of recipeIngredients) {
    const text = extractText(ing);
    if (text.trim()) {
      ingredients.push({ text: text.trim() });
    }
  }

  // Extract instructions
  let instructions = '';
  const recipeInstructions = recipe.recipeInstructions || [];
  
  if (Array.isArray(recipeInstructions)) {
    const instructionTexts = recipeInstructions.map((inst: any) => {
      if (typeof inst === 'string') return inst;
      return extractText(inst.text || inst.name || inst);
    }).filter(Boolean);
    instructions = instructionTexts.join('\n\n');
  } else {
    instructions = extractText(recipeInstructions);
  }

  // Extract nutrition info
  const nutrition = recipe.nutrition ? {
    calories: recipe.nutrition.calories || undefined,
    servingSize: extractText(recipe.nutrition.servingSize) || undefined
  } : undefined;

  // Extract author
  const author = recipe.author ? extractText(recipe.author.name || recipe.author) : undefined;

  // Extract servings/yield
  const servings = recipe.recipeYield ? 
    (typeof recipe.recipeYield === 'number' ? recipe.recipeYield : parseInt(extractText(recipe.recipeYield))) : 
    undefined;

  return {
    name: extractText(recipe.name),
    description: extractText(recipe.description),
    ingredients,
    instructions,
    prepTime: extractDuration(recipe.prepTime),
    cookTime: extractDuration(recipe.cookTime),
    totalTime: extractDuration(recipe.totalTime),
    servings: servings && !isNaN(servings) ? servings : undefined,
    author,
    sourceUrl,
    sourceName: extractText(recipe.publisher?.name || recipe.author?.name),
    tags: recipe.recipeCategory ? [extractText(recipe.recipeCategory)].flat() : undefined,
    imageUrl: extractText(recipe.image?.url || recipe.image),
    nutrition
  };
}

/**
 * Fallback CSS selector-based extraction when structured data is not available
 */
function extractRecipeFromHtml(html: string, sourceUrl: string): ScrapedRecipeData | null {
  const root = parse(html);
  
  // Common selectors for recipe elements
  const selectors = {
    title: [
      'h1[class*="recipe"], h1[itemprop="name"]',
      '.recipe-title, .entry-title',
      'h1'
    ],
    ingredients: [
      '[itemprop="recipeIngredient"], .recipe-ingredient',
      '.ingredients li, .ingredient-list li',
      '.ingredients p, .ingredient p'
    ],
    instructions: [
      '[itemprop="recipeInstructions"], .recipe-instruction',
      '.instructions, .directions, .method',
      '.recipe-instructions'
    ],
    prepTime: [
      '[itemprop="prepTime"]',
      '.prep-time, .recipe-prep-time'
    ],
    cookTime: [
      '[itemprop="cookTime"]', 
      '.cook-time, .recipe-cook-time'
    ],
    totalTime: [
      '[itemprop="totalTime"]',
      '.total-time, .recipe-total-time',
      '.time, .recipe-time'
    ],
    servings: [
      '[itemprop="recipeYield"]',
      '.servings, .recipe-yield, .serves'
    ]
  };

  // Extract title
  let name = '';
  for (const selector of selectors.title) {
    const element = root.querySelector(selector);
    if (element?.text?.trim()) {
      name = element.text.trim();
      break;
    }
  }

  // Extract ingredients
  const ingredients: ScrapedIngredient[] = [];
  for (const selector of selectors.ingredients) {
    const elements = root.querySelectorAll(selector);
    if (elements.length > 0) {
      elements.forEach(el => {
        const text = el.text?.trim();
        if (text) {
          ingredients.push({ text });
        }
      });
      break;
    }
  }

  // Extract instructions
  let instructions = '';
  for (const selector of selectors.instructions) {
    const element = root.querySelector(selector);
    if (element?.text?.trim()) {
      instructions = element.text.trim();
      break;
    }
  }

  // Extract times
  let prepTime = '';
  for (const selector of selectors.prepTime) {
    const element = root.querySelector(selector);
    if (element?.text?.trim()) {
      prepTime = element.text.trim();
      break;
    }
  }

  let cookTime = '';
  for (const selector of selectors.cookTime) {
    const element = root.querySelector(selector);
    if (element?.text?.trim()) {
      cookTime = element.text.trim();
      break;
    }
  }

  let totalTime = '';
  for (const selector of selectors.totalTime) {
    const element = root.querySelector(selector);
    if (element?.text?.trim()) {
      totalTime = element.text.trim();
      break;
    }
  }

  // Extract servings
  let servings = undefined;
  for (const selector of selectors.servings) {
    const element = root.querySelector(selector);
    if (element?.text?.trim()) {
      const servingsText = element.text.trim();
      const match = servingsText.match(/\d+/);
      if (match) {
        servings = parseInt(match[0]);
      }
      break;
    }
  }

  // If no complete recipe data found, return null
  if (!name || ingredients.length === 0 || !instructions) {
    return null;
  }

  return {
    name,
    ingredients,
    instructions,
    prepTime: prepTime || undefined,
    cookTime: cookTime || undefined,
    totalTime: totalTime || undefined,
    servings,
    sourceUrl,
    sourceName: new URL(sourceUrl).hostname
  };
}

/**
 * Main function to scrape recipe data from a URL with enhanced error handling
 */
export async function scrapeRecipeFromUrl(url: string): Promise<RecipeScrapingResult> {
  try {
    console.log(`Starting recipe import from: ${url}`);
    
    // Validate URL
    const validation = validateRecipeUrl(url);
    if (!validation.isValid) {
      console.warn(`URL validation failed: ${validation.error}`);
      return {
        success: false,
        error: validation.error || 'Invalid URL format'
      };
    }

    console.log('URL validation passed, fetching content...');
    
    // Fetch HTML content
    const { html } = await fetchHtmlContent(url);
    console.log(`Successfully fetched HTML content (${html.length} characters)`);
    
    // Try JSON-LD extraction first
    console.log('Attempting to extract structured data (JSON-LD/Microdata)...');
    let recipeData = extractJsonLdRecipe(html, url);
    
    // If structured data fails, try fallback HTML parsing
    if (!recipeData) {
      console.log('No structured data found, trying CSS selector fallback...');
      recipeData = extractRecipeFromHtml(html, url);
    }
    
    if (!recipeData) {
      console.warn('No recipe data could be extracted from the page');
      return {
        success: false,
        error: 'No recipe data found on this page. This might not be a recipe page, or the website may use a format that is not supported. Try copying the recipe manually or use a different recipe source.'
      };
    }

    console.log(`Recipe data extracted: ${recipeData.name}`);

    // Validate minimum required data
    const missingFields = [];
    if (!recipeData.name || recipeData.name.trim() === '') {
      missingFields.push('recipe name');
    }
    if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
      missingFields.push('ingredients');
    }
    if (!recipeData.instructions || 
        (typeof recipeData.instructions === 'string' && recipeData.instructions.trim() === '') ||
        (Array.isArray(recipeData.instructions) && recipeData.instructions.length === 0)) {
      missingFields.push('instructions');
    }

    if (missingFields.length > 0) {
      console.warn(`Incomplete recipe data - missing: ${missingFields.join(', ')}`);
      return {
        success: false,
        error: `Incomplete recipe data found. Missing: ${missingFields.join(', ')}. The recipe page may not have complete information, or the format may not be fully supported.`,
        data: recipeData
      };
    }

    // Additional quality checks
    const warnings = [];
    
    if (recipeData.ingredients.length < 2) {
      warnings.push('Very few ingredients found - please verify the recipe is complete');
    }
    
    if (recipeData.instructions.length < 50) {
      warnings.push('Instructions seem very short - please verify they are complete');
    }
    
    if (!recipeData.prepTime && !recipeData.cookTime && !recipeData.totalTime) {
      warnings.push('No timing information found - you may want to add prep/cook times manually');
    }

    console.log(`Recipe import completed successfully: ${recipeData.name}`);
    if (warnings.length > 0) {
      console.log(`Warnings: ${warnings.join('; ')}`);
    }

    return {
      success: true,
      data: recipeData,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    console.error('Recipe scraping error:', error);
    
    let errorMessage = 'Failed to import recipe';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage += ': Unknown error occurred';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
} 
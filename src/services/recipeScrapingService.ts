import { parse } from 'node-html-parser';
import type { RecipeScrapingResult, ScrapedRecipeData, ScrapedIngredient } from '@/types';

// CORS Proxy options - updated with more reliable services
const CORS_PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://corsproxy.io/?',
  'https://cors.bridged.cc/',
  'https://thingproxy.freeboard.io/fetch/',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://cors-proxy.htmldriven.com/?url=',
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
 * Fetches HTML content from a URL using a CORS proxy
 */
async function fetchHtmlContent(url: string): Promise<{ html: string; finalUrl: string }> {
  let lastError: Error | null = null;
  
  // Try each CORS proxy
  for (const proxy of CORS_PROXIES) {
    try {
      let proxyUrl: string;
      let fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/html, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };

      // Handle different proxy URL formats
      if (proxy.includes('allorigins.win')) {
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
      
      console.log(`Trying proxy: ${proxy.split('?')[0]} for URL: ${url}`);
      
      const response = await fetch(proxyUrl, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      let html: string;
      
      // Handle different response formats
      const contentType = response.headers.get('content-type') || '';
      
      if (proxy.includes('allorigins.win')) {
        const data = await response.json();
        if (!data.contents) {
          throw new Error('No content returned from allorigins proxy');
        }
        html = data.contents;
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
        throw new Error('Received empty or very short response');
      }
      
      console.log(`Successfully fetched content via ${proxy.split('?')[0]}`);
      return { html, finalUrl: url };
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`Failed to fetch via proxy ${proxy.split('?')[0]}:`, error);
      continue;
    }
  }
  
  throw new Error(`Failed to fetch URL with all proxies. Last error: ${lastError?.message || 'Unknown error'}. Try a different recipe URL or check your internet connection.`);
}

/**
 * Extracts recipe data from JSON-LD structured data
 */
function extractJsonLdRecipe(html: string, sourceUrl: string): ScrapedRecipeData | null {
  const root = parse(html);
  const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');
  
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.innerHTML);
      const recipes = Array.isArray(data) ? data : [data];
      
      for (const item of recipes) {
        // Handle arrays and single items
        const recipe = item['@type'] === 'Recipe' ? item : 
                      item['@graph']?.find((g: any) => g['@type'] === 'Recipe') ||
                      null;
        
        if (recipe && recipe['@type'] === 'Recipe') {
          return parseRecipeFromJsonLd(recipe, sourceUrl);
        }
      }
    } catch (error) {
      console.warn('Failed to parse JSON-LD:', error);
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
        if (hours > 0) {
          return `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minutes` : ''}`;
        } else {
          return `${minutes} minutes`;
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
 * Main function to scrape recipe data from a URL
 */
export async function scrapeRecipeFromUrl(url: string): Promise<RecipeScrapingResult> {
  try {
    // Validate URL
    const validation = validateRecipeUrl(url);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Fetch HTML content
    const { html } = await fetchHtmlContent(url);
    
    // Try JSON-LD extraction first
    let recipeData = extractJsonLdRecipe(html, url);
    
    // If JSON-LD fails, try fallback HTML parsing
    if (!recipeData) {
      recipeData = extractRecipeFromHtml(html, url);
    }
    
    if (!recipeData) {
      return {
        success: false,
        error: 'No recipe data found on this page. The page may not contain structured recipe data or may not be a recipe page.'
      };
    }

    // Validate minimum required data
    if (!recipeData.name || recipeData.ingredients.length === 0 || !recipeData.instructions) {
      return {
        success: false,
        error: 'Incomplete recipe data found. Missing name, ingredients, or instructions.',
        data: recipeData
      };
    }

    return {
      success: true,
      data: recipeData
    };

  } catch (error) {
    console.error('Recipe scraping error:', error);
    return {
      success: false,
      error: `Failed to scrape recipe: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
} 
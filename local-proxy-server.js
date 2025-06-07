import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// Enhanced CORS configuration for better Safari compatibility
app.use(cors({
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: false
}));
app.use(express.json());

// Enhanced User-Agent rotation to avoid detection
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Recipe proxy endpoint with enhanced error handling and retry logic
app.get('/recipe-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Log request details for debugging browser differences
    const clientUserAgent = req.headers['user-agent'] || 'Unknown';
    const clientReferer = req.headers['referer'] || 'Direct';
    console.log(`[${clientUserAgent.includes('Safari') && !clientUserAgent.includes('Chrome') ? 'Safari' : 'Chrome'}] Fetching recipe from: ${url}`);
    console.log(`Client: ${clientUserAgent}`);

    console.log(`Fetching recipe from: ${url}`);

    // Enhanced headers with randomized User-Agent
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };

    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
        
        const response = await fetch(url, {
          headers: {
            ...headers,
            'User-Agent': getRandomUserAgent() // Rotate user agent for each retry
          },
          timeout: 15000, // 15 second timeout
          follow: 5, // Follow up to 5 redirects
          compress: true
        });

        if (!response.ok) {
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
          console.warn(`Attempt ${attempt} failed: ${errorMsg}`);
          
          // Some specific error handling
          if (response.status === 403) {
            throw new Error('Access forbidden - website may be blocking automated requests');
          } else if (response.status === 404) {
            throw new Error('Recipe page not found - please check the URL');
          } else if (response.status === 429) {
            throw new Error('Rate limited - please wait a moment before trying again');
          } else if (response.status >= 500) {
            throw new Error('Website server error - please try again later');
          }
          
          throw new Error(errorMsg);
        }

        const html = await response.text();
        
        if (!html || html.trim().length < 100) {
          throw new Error('Received empty or very short response from website');
        }
        
        console.log(`Successfully fetched content from ${url} on attempt ${attempt}`);
        
        // Set headers that Safari expects
        res.set({
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        
        res.json({
          success: true,
          html: html,
          url: url,
          fetchedAt: new Date().toISOString(),
          attempt: attempt
        });
        
        return; // Success - exit retry loop
        
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        // Don't retry for certain errors
        if (error.message.includes('Access forbidden') || 
            error.message.includes('not found') ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ECONNREFUSED') {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed
    throw lastError || new Error('All retry attempts failed');

  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Enhanced error messages for users
    let userFriendlyError = error.message;
    
    if (error.code === 'ENOTFOUND') {
      userFriendlyError = 'Unable to reach the website. Please check the URL and your internet connection.';
    } else if (error.code === 'ECONNREFUSED') {
      userFriendlyError = 'Connection refused by the website. The site may be temporarily unavailable.';
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      userFriendlyError = 'Request timed out. The website may be responding slowly. Please try again.';
    } else if (error.message.includes('Access forbidden')) {
      userFriendlyError = 'This website is blocking automated access. Try copying the recipe manually or use a different recipe source.';
    }
    
    res.status(500).json({
      success: false,
      error: userFriendlyError,
      technicalError: error.message,
      code: error.code
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'recipe-proxy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Local recipe proxy server running on http://localhost:${PORT}`);
  console.log(`Usage: GET /recipe-proxy?url=<recipe-url>`);
});

export default app; 
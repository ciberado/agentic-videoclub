import * as cheerio from 'cheerio';
import logger from '../config/logger';
import { logHttpRequest, logHttpResponse } from '../utils/logging';

// Limit scraping results, smaller limit during tests
const isTestEnvironment = process.env.NODE_ENV === 'test' || 
                          process.env.JEST_WORKER_ID !== undefined ||
                          typeof (global as any).testSetupLogged !== 'undefined';
const defaultLimit = isTestEnvironment ? '5' : '20';
const SCRAPPING_LIMIT = parseInt(process.env.SCRAPPING_LIMIT || defaultLimit);

/**
 * Prime Video Scraper Service
 * 
 * Handles web scraping of Prime Video movie listings and detailed information.
 * Implements rate limiting, proper headers, and error handling to avoid detection
 * while respecting the service's resources.
 */

export interface PrimeVideoMovieLink {
  title: string;
  url: string;
  detailUrl?: string;
}

export interface PrimeVideoMovieDetails {
  title: string;
  url: string;
  year?: number;
  description?: string;
  genre?: string[];
  rating?: string;
  director?: string;
  cast?: string[];
  runtime?: string;
  rawHtml?: string; // For LLM processing
}

/**
 * HTTP client configuration for Prime Video scraping
 */
const HTTP_CONFIG = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  },
  timeout: 10000, // 10 second timeout
};

/**
 * Add random delay to avoid detection
 */
async function randomDelay(minMs: number = 100, maxMs: number = 300): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Fetch HTML content with error handling and retries
 */
async function fetchWithRetry(url: string, retries: number = 2): Promise<string> {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      logHttpRequest(url, 'GET');
      const startTime = Date.now();
      
      const response = await fetch(url, HTTP_CONFIG);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      logHttpResponse(url, response.status, responseTime, html.length);
      
      logger.debug('✅ HTTP request successful', {
        component: 'prime-video-scraper',
        url: url.substring(0, 50) + '...',
        status: response.status,
        size: html.length,
        attempt
      });
      
      return html;
      
    } catch (error) {
      logger.warn(`⚠️ HTTP request failed (attempt ${attempt}/${retries + 1})`, {
        component: 'prime-video-scraper',
        url: url.substring(0, 50) + '...',
        error: error instanceof Error ? error.message : String(error),
        attempt
      });
      
      if (attempt <= retries) {
        await randomDelay(1000, 2000); // Longer delay between retries
      } else {
        throw error;
      }
    }
  }
  throw new Error('All retry attempts failed');
}

/**
 * Extract movie links from Prime Video movie listing page
 */
export async function extractPrimeVideoMovieLinks(baseUrl: string = 'https://www.primevideo.com/-/es/movie'): Promise<PrimeVideoMovieLink[]> {
  try {
    logger.info('🎬 Starting Prime Video movie link extraction', {
      component: 'prime-video-scraper',
      baseUrl
    });

    const html = await fetchWithRetry(baseUrl);
    const $ = cheerio.load(html);
    
    // Extract movie links using the specified selector
    const movieLinks: PrimeVideoMovieLink[] = [];
    $('article[data-card-title] a').each((index, element) => {
      const $link = $(element);
      const title = $link.attr('data-card-title') || 
                    $link.find('[data-card-title]').attr('data-card-title') ||
                    $link.text().trim();
      const relativeUrl = $link.attr('href');
      
      if (title && relativeUrl) {
        const fullUrl = relativeUrl.startsWith('http') 
          ? relativeUrl 
          : `https://www.primevideo.com${relativeUrl}`;
          
        movieLinks.push({
          title: title.trim(),
          url: fullUrl
        });
      }
    });

    // Also try alternative selectors in case the primary one doesn't work
    if (movieLinks.length === 0) {
      logger.warn('⚠️ Primary selector found no results, trying alternatives', {
        component: 'prime-video-scraper'
      });
      
      // Try alternative selectors
      $('a[href*="/movie/"], a[href*="/gp/video/"]').each((index, element) => {
        if (movieLinks.length >= SCRAPPING_LIMIT) return false; // Limit results
        
        const $link = $(element);
        const title = $link.text().trim() || 
                     $link.find('img').attr('alt') ||
                     $link.attr('title') ||
                     'Unknown Movie';
        const relativeUrl = $link.attr('href');
        
        if (title && relativeUrl && title.length > 2) {
          const fullUrl = relativeUrl.startsWith('http') 
            ? relativeUrl 
            : `https://www.primevideo.com${relativeUrl}`;
            
          movieLinks.push({
            title: title.trim(),
            url: fullUrl
          });
        }
      });
    }

    logger.debug('🎬 Prime Video movie links extracted successfully', {
      component: 'prime-video-scraper',
      moviesFound: movieLinks.length,
      sampleTitles: movieLinks.slice(0, 3).map(m => m.title)
    });

    return movieLinks.slice(0, 100); // Limit to 100 movies for batch processing
    
  } catch (error) {
    logger.error('❌ Failed to extract Prime Video movie links', {
      component: 'prime-video-scraper',
      error: error instanceof Error ? error.message : String(error),
      baseUrl
    });
    
    // Return empty array instead of throwing to allow graceful fallback
    return [];
  }
}

/**
 * Fetch detailed movie information from Prime Video movie page
 */
export async function fetchPrimeVideoMovieDetails(movieLink: PrimeVideoMovieLink): Promise<PrimeVideoMovieDetails> {
  try {
    logger.debug('🔍 Fetching movie details', {
      component: 'prime-video-scraper',
      title: movieLink.title,
      url: movieLink.url.substring(0, 50) + '...'
    });

    // Add delay between requests to avoid rate limiting
    await randomDelay(50, 200);
    
    const html = await fetchWithRetry(movieLink.url);
    const $ = cheerio.load(html);
    
    // Extract basic information (will be enhanced by LLM)
    const title = $('h1').first().text().trim() || 
                 $('[data-automation-id="title"]').text().trim() ||
                 movieLink.title;
    
    const description = $('[data-automation-id="synopsis"]').text().trim() ||
                       $('p[data-automation-id="plot-summary"]').text().trim() ||
                       $('.plot-summary').text().trim();
    
    // Try to extract year from title or page
    const yearMatch = title.match(/\((\d{4})\)/) || html.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
    
    const details: PrimeVideoMovieDetails = {
      title: title,
      url: movieLink.url,
      year: year,
      description: description,
      rawHtml: html.substring(0, 15000) // First 15KB for LLM processing
    };

    logger.debug('✅ Movie details extracted', {
      component: 'prime-video-scraper',
      title: details.title,
      hasDescription: !!details.description,
      year: details.year
    });

    return details;
    
  } catch (error) {
    logger.error('❌ Failed to fetch movie details', {
      component: 'prime-video-scraper',
      title: movieLink.title,
      url: movieLink.url,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return basic info even if detailed fetch fails
    return {
      title: movieLink.title,
      url: movieLink.url,
      description: 'Details could not be fetched',
      rawHtml: ''
    };
  }
}

/**
 * Batch fetch movie details with rate limiting
 */
export async function fetchPrimeVideoMoviesBatch(movieLinks: PrimeVideoMovieLink[]): Promise<PrimeVideoMovieDetails[]> {
  logger.info('🎬 Starting batch movie details fetching', {
    component: 'prime-video-scraper',
    batchSize: movieLinks.length
  });

  const movieDetails: PrimeVideoMovieDetails[] = [];
  
  for (let i = 0; i < movieLinks.length; i++) {
    try {
      const details = await fetchPrimeVideoMovieDetails(movieLinks[i]);
      movieDetails.push(details);
      
      logger.debug('📄 Movie detail fetched', {
        component: 'prime-video-scraper',
        progress: `${i + 1}/${movieLinks.length}`,
        title: details.title
      });
      
    } catch (error) {
      logger.warn('⚠️ Skipping movie due to fetch error', {
        component: 'prime-video-scraper',
        title: movieLinks[i].title,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Rate limiting: delay between each movie detail fetch
    if (i < movieLinks.length - 1) {
      await randomDelay(100, 300);
    }
  }

  logger.info('📦 Batch movie details fetching completed', {
    component: 'prime-video-scraper',
    totalFetched: movieDetails.length,
    successRate: `${((movieDetails.length / movieLinks.length) * 100).toFixed(1)}%`
  });

  return movieDetails;
}
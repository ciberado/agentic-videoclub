import logger from '../config/logger';
import { 
  logNodeStart, 
  logNodeExecution
} from '../utils/logging';
import { extractPrimeVideoMovieLinks, fetchPrimeVideoMoviesBatch } from '../services/prime-video-scraper';
import { normalizeMoviesBatch } from '../services/movie-normalization-llm';
import { movieCache } from '../services/movie-cache';
import type { Movie } from '../types';
import type { VideoRecommendationAgentState } from '../state/definition';

/**
 * Movie Discovery & Data Fetching Node - Prime Video Scraping with Intelligent Caching
 * 
 * PURPOSE:
 * Scrapes Prime Video website to discover movies and fetches comprehensive metadata 
 * through a multi-phase process with intelligent caching to optimize performance.
 * This node handles the complete "data acquisition" pipeline from initial discovery
 * to structured movie objects ready for downstream evaluation.
 * 
 * WORKFLOW:
 * Phase 1: Extract movie links from Prime Video listings (up to 50 movies)
 * Phase 2: Check cache for previously processed movies to avoid redundant work
 * Phase 3: Fetch detailed metadata for uncached movies via web scraping
 * Phase 4: Normalize raw movie data using LLM-powered batch processing
 * Phase 5: Cache newly processed movies and combine with cached results
 * 
 * DATA PROCESSING:
 * - Web scraping with rate limiting and proper headers to avoid detection
 * - LLM-powered normalization to standardize movie metadata format
 * - Intelligent caching system to minimize redundant API calls and processing
 * - Genre standardization, release year validation, and cast information extraction
 * - Content rating parsing and theme extraction from plot summaries
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Cache hit rate tracking and reporting for monitoring efficiency
 * - Batch processing of movie details to reduce HTTP overhead
 * - Graceful fallback handling when scraping fails
 * - Comprehensive logging for debugging and performance analysis
 */
export async function movieDiscoveryAndDataFetchingNode(
  state: typeof VideoRecommendationAgentState.State
): Promise<Partial<typeof VideoRecommendationAgentState.State>> {
  const nodeId = 'movie_discovery_and_data_fetching_node';
  const startTime = logNodeStart(nodeId, 'discover_and_fetch_movie_batch', { 
    searchAttempt: state.searchAttemptNumber,
    searchTerms: state.enhancedUserCriteria?.searchTerms 
  });

  logger.info('🎬 Starting movie discovery and data fetching', {
    nodeId,
    searchAttempt: state.searchAttemptNumber,
    searchTerms: state.enhancedUserCriteria?.searchTerms,
    targetGenres: state.enhancedUserCriteria?.enhancedGenres
  });

  // Use real Prime Video scraping with cache optimization
  let selectedMovies: Movie[] = [];
  
  try {
    // Phase 1: Extract movie links from Prime Video
    logger.info('🌐 Attempting Prime Video movie discovery', { nodeId });
    const movieLinks = await extractPrimeVideoMovieLinks('https://www.primevideo.com/-/es/movie');
    
    if (movieLinks.length > 0) {
      // Phase 2: Check cache for existing normalized movies
      logger.info('�️ Checking cache for existing movies', { 
        nodeId, 
        linksFound: movieLinks.length 
      });
      
      const movieUrls = movieLinks.map(link => link.url);
      const cachedMovies = await movieCache.getMovies(movieUrls);
      const cachedUrls = Object.keys(cachedMovies);
      
      // Identify movies that need to be fetched and normalized
      const uncachedLinks = movieLinks.filter(link => !cachedUrls.includes(link.url));
      
      logger.info('📊 Cache analysis completed', {
        nodeId,
        totalMovies: movieLinks.length,
        cachedMovies: cachedUrls.length,
        uncachedMovies: uncachedLinks.length,
        cacheHitRate: `${((cachedUrls.length / movieLinks.length) * 100).toFixed(1)}%`
      });
      
      // Phase 3: Fetch and normalize uncached movies
      let newlyNormalizedMovies: Movie[] = [];
      if (uncachedLinks.length > 0) {
        logger.info('🔍 Fetching details for uncached movies', { 
          nodeId, 
          uncachedCount: uncachedLinks.length 
        });
        
        const movieDetails = await fetchPrimeVideoMoviesBatch(uncachedLinks);
        
        logger.info('🧠 Normalizing uncached movies with LLM', { 
          nodeId, 
          detailsToNormalize: movieDetails.length 
        });
        
        newlyNormalizedMovies = await normalizeMoviesBatch(movieDetails);
        
        // Phase 4: Cache the newly normalized movies
        if (newlyNormalizedMovies.length > 0) {
          logger.info('💾 Caching newly normalized movies', {
            nodeId,
            moviesToCache: newlyNormalizedMovies.length
          });
          
          const cacheData = newlyNormalizedMovies.map((movie, index) => ({
            url: movieDetails[index]?.url || uncachedLinks[index]?.url,
            movie
          })).filter(item => item.url); // Only cache items with valid URLs
          
          await movieCache.setMovies(cacheData);
        }
      }
      
      // Phase 5: Combine cached and newly normalized movies
      selectedMovies = [
        ...Object.values(cachedMovies),
        ...newlyNormalizedMovies
      ];
      
      logger.info('✅ Prime Video discovery completed successfully', {
        nodeId,
        totalMovies: selectedMovies.length,
        fromCache: Object.keys(cachedMovies).length,
        newlyProcessed: newlyNormalizedMovies.length,
        source: 'prime-video-with-cache'
      });
      
    } else {
      throw new Error('No Prime Video movies found');
    }
    
  } catch (error) {
    logger.error('❌ Prime Video scraping failed', {
      nodeId,
      error: error instanceof Error ? error.message : String(error)
    });

    // Fail gracefully - return empty batch to trigger retry or handle upstream
    selectedMovies = [];
  }

  if (selectedMovies.length > 0) {
    logger.info('📦 Movie batch discovery and fetching completed', {
      nodeId,
      totalMoviesFound: selectedMovies.length,
      batchSize: selectedMovies.length,
      averageRating: (selectedMovies.reduce((sum, m) => sum + m.rating, 0) / selectedMovies.length).toFixed(1),
      genreDistribution: [...new Set(selectedMovies.flatMap(m => m.genre))]
    });
  } else {
    logger.warn('📦 Movie discovery failed - no movies found', {
      nodeId,
      totalMoviesFound: 0,
      requiresRetry: true
    });
  }

  logNodeExecution(nodeId, 'discover_and_fetch_movie_batch', startTime, {
    moviesDiscovered: selectedMovies.length,
    httpRequestsMade: selectedMovies.length > 0 ? selectedMovies.length + 1 : 1,
    dataStructured: selectedMovies.length > 0,
    batchQuality: selectedMovies.length > 5 ? 'good' : selectedMovies.length > 0 ? 'limited' : 'failed',
    dataSource: selectedMovies.length > 0 ? 'prime-video' : 'none'
  });

  return {
    discoveredMoviesBatch: selectedMovies
  };
}
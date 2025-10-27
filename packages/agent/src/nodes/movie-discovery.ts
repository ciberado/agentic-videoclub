import logger from '../config/logger';
import { 
  logNodeStart, 
  logNodeExecution
} from '../utils/logging';
import { extractPrimeVideoMovieLinks, fetchPrimeVideoMoviesBatch } from '../services/prime-video-scraper';
import { normalizeMoviesBatch } from '../services/movie-normalization-llm';
import type { Movie } from '../types';
import type { VideoRecommendationAgentState } from '../state/definition';

/**
 * Movie Discovery & Data Fetching Node - Recursive Data Collection & Structured Extraction
 * 
 * PURPOSE:
 * Discovers and fetches comprehensive movie metadata through recursive HTTP operations.
 * This node handles the "data acquisition" phase, transforming search criteria into
 * structured movie objects with complete metadata for downstream evaluation.
 * 
 * The LLM should be able to retrieve the basic webpage with the initial list of films,
 * identify the different items and then retrieve the detail information that will include
 * the summary, cast, score, etc.
 * 
 * DATA STRUCTURING:
 * - Normalize API responses to internal Movie interface
 * - Genre standardization and mapping
 * - Release year validation and formatting
 * - Director/cast information extraction
 * - Content rating parsing and standardization
 * - Theme extraction from plot summaries (potential LLM assistance)
 * 
 * 
 * EDUCATIONAL VALUE:
 * Demonstrates real-world data fetching patterns, API integration strategies,
 * and the importance of robust error handling in distributed systems.
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

  // Use real Prime Video scraping or fallback to fake data
  let selectedMovies: Movie[] = [];
  
  try {
    // Phase 1: Extract movie links from Prime Video
    logger.info('🌐 Attempting Prime Video movie discovery', { nodeId });
    const movieLinks = await extractPrimeVideoMovieLinks('https://www.primevideo.com/-/es/movie');
    
    if (movieLinks.length > 0) {
      // Phase 2: Fetch detailed information for each movie
      logger.info('🔍 Fetching Prime Video movie details', { 
        nodeId, 
        linksFound: movieLinks.length 
      });
      const movieDetails = await fetchPrimeVideoMoviesBatch(movieLinks);
      
      // Phase 3: Normalize data using LLM
      logger.info('🧠 Normalizing Prime Video data with LLM', { 
        nodeId, 
        detailsToNormalize: movieDetails.length 
      });
      selectedMovies = await normalizeMoviesBatch(movieDetails);
      
      logger.info('✅ Prime Video scraping completed successfully', {
        nodeId,
        moviesExtracted: selectedMovies.length,
        source: 'prime-video'
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
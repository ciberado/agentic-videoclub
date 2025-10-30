import logger from '../config/logger';
import { movieCache } from '../services/movie-cache';
import { normalizeMoviesBatch } from '../services/movie-normalization-llm';
import {
  extractPrimeVideoMovieLinks,
  fetchPrimeVideoMoviesBatch,
  extractRelatedMovies,
} from '../services/prime-video-scraper';
import type { VideoRecommendationAgentState } from '../state/definition';
import type { Movie, MovieLink } from '../types';
import { logNodeStart, logNodeExecution } from '../utils/logging';
import {
  getAllDiscoveredMovies,
  addProcessedMovies,
  getDiscoveryStats,
} from '../utils/state-helpers';

/**
 * Movie Discovery & Data Fetching Node - Production Web Scraping with Intelligent Caching
 *
 * PURPOSE:
 * Discovers and fetches movie data from Prime Video through real-time web scraping,
 * with intelligent SQLite caching for performance optimization. Processes movies in
 * paginated batches to support the workflow's batch evaluation pattern.
 *
 * CURRENT IMPLEMENTATION:
 * - Web Scraping: Live Prime Video scraping using Cheerio HTML parser
 * - Caching Strategy: SQLite database with better-sqlite3 for 100% cache hit performance
 * - Batch Processing: Configurable batch sizes (default: 10 movies) with offset pagination
 * - LLM Normalization: Claude 3 Haiku-powered metadata standardization and theme extraction
 * - Token Tracking: Integrated token consumption monitoring for normalization operations
 * - Resource Guardrails: Maximum limits to prevent runaway processing
 *
 * CORE PROCESSING FLOW:
 * 1. Extract movie links from Prime Video search results or queued links
 * 2. Check SQLite cache for existing movie data (cache hit optimization)
 * 3. Scrape missing movies from Prime Video detail pages
 * 4. Normalize scraped data using Claude 3 Haiku for consistency
 * 5. Cache normalized movies in SQLite for future requests
 * 6. Prepare paginated batch for evaluation node
 * 7. Queue related movie links for recursive discovery (when enabled)
 *
 * STATE MANAGEMENT:
 * - processedMovies: All normalized movie data accumulated across batches
 * - movieLinksQueue: Pending movie links for future processing
 * - discoveredMoviesBatch: Current batch prepared for evaluation
 * - movieBatchOffset: Pagination offset for batch processing
 * - Discovery depth tracking for recursive movie discovery
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - SQLite caching eliminates redundant web scraping
 * - Batch processing prevents overwhelming downstream nodes
 * - Rate limiting and proper headers for ethical scraping
 * - Structured error handling with fallback strategies
 */
export async function movieDiscoveryAndDataFetchingNode(
  state: typeof VideoRecommendationAgentState.State,
): Promise<Partial<typeof VideoRecommendationAgentState.State>> {
  const nodeId = 'movie_discovery_and_data_fetching_node';
  const startTime = logNodeStart(nodeId, 'discover_and_fetch_movie_batch', {
    searchAttempt: state.searchAttemptNumber,
    batchOffset: state.movieBatchOffset || 0,
    batchSize: state.movieBatchSize || 10,
  });

  // Resource guardrails
  const MAX_TOTAL_MOVIES = 200;
  const MAX_QUEUE_SIZE = 100;
  const MAX_EXECUTION_TIME = 5 * 60 * 1000; // 5 minutes
  const executionStartTime = Date.now();

  const batchOffset = state.movieBatchOffset || 0;
  const batchSize = state.movieBatchSize || 10;

  // Get current state using helper functions
  const currentStats = getDiscoveryStats(state);
  const allMovies = getAllDiscoveredMovies(state);

  logger.info('🎬 Starting movie discovery and data fetching', {
    nodeId,
    searchAttempt: state.searchAttemptNumber,
    batchOffset,
    batchSize,
    currentStats,
  });

  // Check guardrails
  if (Date.now() - executionStartTime > MAX_EXECUTION_TIME) {
    logger.warn('⏰ Execution time limit reached');
    return createCurrentBatchResponse(state, allMovies, batchOffset, batchSize);
  }

  if (allMovies.length >= MAX_TOTAL_MOVIES) {
    logger.warn('📊 Total movies limit reached', {
      total: allMovies.length,
      max: MAX_TOTAL_MOVIES,
    });
    return createCurrentBatchResponse(state, allMovies, batchOffset, batchSize);
  }

  // If we have enough movies for current batch, return them
  if (allMovies.length >= batchOffset + batchSize) {
    const currentBatch = allMovies.slice(batchOffset, batchOffset + batchSize);
    logger.info('📦 Using existing movies for current batch', {
      nodeId,
      batchOffset,
      batchSize,
      totalAvailable: allMovies.length,
    });

    return {
      discoveredMoviesBatch: currentBatch,
      movieBatchOffset: batchOffset,
      movieBatchSize: batchSize,
    };
  }

  // Need to discover more movies
  let updatedProcessedMovies = state.processedMovies || [];
  let updatedMovieLinksQueue = [...(state.movieLinksQueue || [])];
  const updatedProcessedUrls = new Set(state.processedUrls || []);

  // First time discovery - get initial movie links
  if (allMovies.length === 0) {
    try {
      logger.info('🌐 Initial movie discovery from Prime Video');
      const movieLinks = await extractPrimeVideoMovieLinks('https://www.primevideo.com/-/es/movie');

      if (movieLinks.length > 0) {
        // Add links to queue
        const newLinks: MovieLink[] = movieLinks.map((link) => ({
          ...link,
          source: 'initial_discovery',
          addedAt: new Date(),
        }));

        updatedMovieLinksQueue = [...updatedMovieLinksQueue, ...newLinks];

        logger.info('✅ Initial discovery completed', {
          nodeId,
          linksFound: movieLinks.length,
          totalQueued: updatedMovieLinksQueue.length,
        });
      }
    } catch (error) {
      logger.error('❌ Initial discovery failed', {
        nodeId,
        error: error instanceof Error ? error.message : String(error),
      });
      return createCurrentBatchResponse(state, [], batchOffset, batchSize);
    }
  }

  // Process queued links if we have them
  if (updatedMovieLinksQueue.length > 0) {
    const linksToProcess = updatedMovieLinksQueue
      .filter((link) => !updatedProcessedUrls.has(link.url))
      .slice(0, Math.min(batchSize * 2, 20)); // Process a reasonable batch

    if (linksToProcess.length > 0) {
      try {
        logger.info('🔄 Processing queued movie links', {
          nodeId,
          linksToProcess: linksToProcess.length,
          totalQueued: updatedMovieLinksQueue.length,
        });

        // Check cache first
        const urlsToProcess = linksToProcess.map((link) => link.url);
        const cachedMovies = await movieCache.getMovies(urlsToProcess);
        const cachedUrls = Object.keys(cachedMovies);

        // Get uncached links
        const uncachedLinks = linksToProcess.filter((link) => !cachedUrls.includes(link.url));

        // Fetch and normalize uncached movies
        let newMovies: Movie[] = [];
        let processedUrls: string[] = [];

        if (uncachedLinks.length > 0) {
          const movieDetails = await fetchPrimeVideoMoviesBatch(uncachedLinks);
          newMovies = await normalizeMoviesBatch(movieDetails);
          processedUrls = movieDetails.map((detail) => detail.url).filter(Boolean);

          // Cache new movies
          if (newMovies.length > 0) {
            const cacheData = newMovies
              .map((movie, index) => ({
                url: processedUrls[index] || uncachedLinks[index]?.url,
                movie,
              }))
              .filter((item) => item.url);

            await movieCache.setMovies(cacheData);
          }

          // Extract related movies for future processing
          movieDetails.forEach((detail) => {
            if (detail.rawHtml && updatedMovieLinksQueue.length < MAX_QUEUE_SIZE) {
              const relatedMovies = extractRelatedMovies(detail.rawHtml);
              relatedMovies.forEach((relatedMovie) => {
                if (
                  !updatedProcessedUrls.has(relatedMovie.url) &&
                  updatedMovieLinksQueue.length < MAX_QUEUE_SIZE
                ) {
                  updatedMovieLinksQueue.push({
                    ...relatedMovie,
                    source: 'related_movie',
                    addedAt: new Date(),
                  });
                }
              });
            }
          });
        }

        // Combine cached and new movies
        const allNewMovies = [...Object.values(cachedMovies), ...newMovies];
        const allProcessedUrls = [...cachedUrls, ...processedUrls];

        // Update processed movies using helper
        updatedProcessedMovies = addProcessedMovies(
          { ...state, processedMovies: updatedProcessedMovies },
          allNewMovies,
          allProcessedUrls,
          'initial_discovery',
        );

        // Update processed URLs
        allProcessedUrls.forEach((url) => updatedProcessedUrls.add(url));

        // Remove processed links from queue
        const processedUrlSet = new Set(allProcessedUrls);
        updatedMovieLinksQueue = updatedMovieLinksQueue.filter(
          (link) => !processedUrlSet.has(link.url),
        );

        logger.info('✅ Processed movie links successfully', {
          nodeId,
          newMoviesAdded: allNewMovies.length,
          totalProcessed: updatedProcessedMovies.length,
          remainingQueued: updatedMovieLinksQueue.length,
        });
      } catch (error) {
        logger.error('❌ Failed to process movie links', {
          nodeId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Create current batch from processed movies
  const updatedAllMovies = updatedProcessedMovies.map((pm) => pm.movie);
  const currentBatch = updatedAllMovies.slice(batchOffset, batchOffset + batchSize);

  logger.info('📦 Movie batch prepared for evaluation', {
    nodeId,
    batchSize: currentBatch.length,
    totalMoviesAvailable: updatedAllMovies.length,
    queuedLinks: updatedMovieLinksQueue.length,
  });

  logNodeExecution(nodeId, 'discover_and_fetch_movie_batch', startTime, {
    moviesDiscovered: updatedAllMovies.length,
    currentBatchSize: currentBatch.length,
    dataStructured: currentBatch.length > 0,
    dataSource: 'prime-video',
  });

  return {
    processedMovies: updatedProcessedMovies,
    discoveredMoviesBatch: currentBatch,
    movieBatchOffset: batchOffset,
    movieBatchSize: batchSize,
    movieLinksQueue: updatedMovieLinksQueue.slice(0, MAX_QUEUE_SIZE), // Apply guardrail
    processedUrls: updatedProcessedUrls,
    discoveryDepth: state.discoveryDepth || 0,
    maxDiscoveryDepth: state.maxDiscoveryDepth || 2,
  };
}

/**
 * Helper function to create response with current batch
 */
function createCurrentBatchResponse(
  state: typeof VideoRecommendationAgentState.State,
  allMovies: Movie[],
  batchOffset: number,
  batchSize: number,
): Partial<typeof VideoRecommendationAgentState.State> {
  const currentBatch = allMovies.slice(batchOffset, batchOffset + batchSize);

  return {
    discoveredMoviesBatch: currentBatch,
    movieBatchOffset: batchOffset,
    movieBatchSize: batchSize,
    movieLinksQueue: [], // Clear queue to stop processing
    processedUrls: state.processedUrls || new Set<string>(),
    discoveryDepth: state.discoveryDepth || 0,
    maxDiscoveryDepth: state.maxDiscoveryDepth || 2,
  };
}

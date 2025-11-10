import logger from '../config/logger';
import { movieCache } from '../services/movie-cache';
import { normalizeMoviesBatch } from '../services/movie-normalization-llm';
import {
  extractPrimeVideoMovieLinks,
  fetchPrimeVideoMoviesBatch,
  fetchPrimeVideoMovieDetails,
  type PrimeVideoMovieDetails,
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
 * Movie Discovery & Data Fetching Node
 *
 * This node discovers and fetches movie data from Prime Video through web scraping,
 * using SQLite caching to avoid re-scraping the same movies. It processes movies
 * in batches to work with the evaluation workflow.
 *
 * How it works:
 * - First run: Scrapes Prime Video search results to get initial movie links
 * - Subsequent runs: Processes queued movie links from previous discoveries
 * - Always checks cache first to avoid unnecessary scraping
 * - Scrapes missing movies and normalizes their data using Claude 3 Haiku
 * - Extracts related movie links from each processed movie (both cached and new)
 * - Returns a batch of movies for the evaluation node to process
 *
 * Key features:
 * - Smart caching: Uses SQLite to store normalized movie data
 * - Batch processing: Returns configurable batches (default 10 movies) with pagination
 * - Related movie discovery: Finds and queues related movies for future processing
 * - Resource limits: Prevents runaway processing with guardrails
 * - Mixed processing: Handles both cached and newly scraped movies in the same batch
 *
 * The node maintains several queues and collections:
 * - processedMovies: All discovered movies across all batches
 * - movieLinksQueue: Pending movie links waiting to be processed
 * - discoveredMoviesBatch: Current batch ready for evaluation
 * - Pagination tracking for batch management
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
  // Normalize URLs in the processed set to ensure consistent comparison
  const updatedProcessedUrls = new Set(
    Array.from(state.processedUrls || []).map((url) =>
      url.startsWith('http') ? url : `https://www.primevideo.com${url}`,
    ),
  );

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
        let allMovieDetails: PrimeVideoMovieDetails[] = [];
        let relatedMoviesExtracted = 0;
        let totalRelatedMoviesQueued = 0;
        const relatedMovieExtractionStartTime = Date.now();

        if (uncachedLinks.length > 0) {
          const movieDetails = await fetchPrimeVideoMoviesBatch(uncachedLinks);
          newMovies = await normalizeMoviesBatch(movieDetails);
          processedUrls = movieDetails.map((detail) => detail.url).filter(Boolean);
          allMovieDetails = movieDetails;

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

          // Extract related movies from fetched movie details
          // These were already extracted during the fetchPrimeVideoMoviesBatch call
          allMovieDetails.forEach((detail) => {
            if (detail.relatedMovies && updatedMovieLinksQueue.length < MAX_QUEUE_SIZE) {
              detail.relatedMovies.forEach((relatedMovie) => {
                // Normalize URL
                const normalizedUrl = relatedMovie.url.startsWith('http')
                  ? relatedMovie.url
                  : `https://www.primevideo.com${relatedMovie.url}`;

                const isAlreadyProcessed = updatedProcessedUrls.has(normalizedUrl);
                const isQueueFull = updatedMovieLinksQueue.length >= MAX_QUEUE_SIZE;
                const isAlreadyQueued = updatedMovieLinksQueue.some(
                  (queuedLink) => queuedLink.url === normalizedUrl,
                );

                if (!isAlreadyProcessed && !isQueueFull && !isAlreadyQueued) {
                  updatedMovieLinksQueue.push({
                    title: relatedMovie.title,
                    url: normalizedUrl,
                    source: 'related_movie',
                    addedAt: new Date(),
                  });
                  relatedMoviesExtracted++;
                  totalRelatedMoviesQueued++;

                  logger.debug('🔗 Queued related movie', {
                    nodeId,
                    sourceMovie: detail.title,
                    relatedMovie: relatedMovie.title,
                    url: normalizedUrl,
                  });
                }
              });
            }
          });
        }

        // For cached movies, we need to fetch their details to get related movies
        // since cached data doesn't include the related movies field
        for (const cachedUrl of cachedUrls) {
          if (updatedMovieLinksQueue.length >= MAX_QUEUE_SIZE) break;

          try {
            const cachedLink = linksToProcess.find((link) => link.url === cachedUrl);
            if (!cachedLink) continue;

            logger.debug('🔍 Fetching related movies for cached movie', {
              nodeId,
              title: cachedLink.title,
              url: cachedUrl.substring(0, 50) + '...',
            });

            const movieDetail = await fetchPrimeVideoMovieDetails(cachedLink);

            if (movieDetail.relatedMovies) {
              movieDetail.relatedMovies.forEach((relatedMovie) => {
                const normalizedUrl = relatedMovie.url.startsWith('http')
                  ? relatedMovie.url
                  : `https://www.primevideo.com${relatedMovie.url}`;

                const isAlreadyProcessed = updatedProcessedUrls.has(normalizedUrl);
                const isQueueFull = updatedMovieLinksQueue.length >= MAX_QUEUE_SIZE;
                const isAlreadyQueued = updatedMovieLinksQueue.some(
                  (queuedLink) => queuedLink.url === normalizedUrl,
                );

                if (!isAlreadyProcessed && !isQueueFull && !isAlreadyQueued) {
                  updatedMovieLinksQueue.push({
                    title: relatedMovie.title,
                    url: normalizedUrl,
                    source: 'related_movie',
                    addedAt: new Date(),
                  });
                  relatedMoviesExtracted++;
                  totalRelatedMoviesQueued++;

                  logger.debug('🔗 Queued related movie from cached source', {
                    nodeId,
                    sourceMovie: cachedLink.title,
                    relatedMovie: relatedMovie.title,
                    url: normalizedUrl,
                  });
                }
              });
            }
          } catch (error) {
            logger.warn('⚠️ Failed to extract related movies for cached movie', {
              nodeId,
              url: cachedUrl,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const relatedExtractionTime = Date.now() - relatedMovieExtractionStartTime;
        logger.info('🔗 Related movie extraction completed', {
          nodeId,
          processedMovies: linksToProcess.length,
          relatedMoviesFound: relatedMoviesExtracted,
          relatedMoviesQueued: totalRelatedMoviesQueued,
          executionTime: `${relatedExtractionTime}ms`,
        });

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

        // Update processed URLs with normalization
        allProcessedUrls.forEach((url) => {
          const normalizedUrl = url.startsWith('http') ? url : `https://www.primevideo.com${url}`;
          updatedProcessedUrls.add(normalizedUrl);
        });

        // Remove processed links from queue
        const processedUrlSet = new Set(
          allProcessedUrls.map((url) =>
            url.startsWith('http') ? url : `https://www.primevideo.com${url}`,
          ),
        );
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

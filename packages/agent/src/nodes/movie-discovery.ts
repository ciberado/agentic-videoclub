import logger from '../config/logger';
import { 
  logNodeStart, 
  logNodeExecution, 
  logHttpRequest, 
  logHttpResponse
} from '../utils/logging';
import { simulateDelay, generateFakeApiUrl } from '../data/generators';
import { fakeMovieDatabase } from '../data/fake-movies';
import type { Movie } from '../types';
import type { VideoRecommendationAgentState } from '../state/definition';

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

  // Simulate HTTP requests to movie websites
  const searchParams = state.enhancedUserCriteria?.searchTerms.join('+') || 'sci-fi';
  const searchUrl = generateFakeApiUrl('/search', { 
    genre: searchParams, 
    limit: '15' 
  });
  
  logHttpRequest(searchUrl, 'GET');
  await simulateDelay(200); // Simulate HTTP delay
  logHttpResponse(searchUrl, 200, 200, 25600);

  // Simulate recursive data fetching for movie details
  const batchSize = 10 + Math.floor(Math.random() * 5); // 10-14 movies per batch
  const selectedMovies: Movie[] = [];
  
  for (let i = 0; i < Math.min(batchSize, fakeMovieDatabase.length); i++) {
    const movie = fakeMovieDatabase[i];
    
    // Simulate fetching detailed movie information
    const detailUrl = generateFakeApiUrl(`/movie/${movie.title.toLowerCase().replace(/\s+/g, '-')}`);
    logHttpRequest(detailUrl, 'GET');
    await simulateDelay(50); // Simulate detail fetch delay
    logHttpResponse(detailUrl, 200, 50, 8192);
    
    selectedMovies.push(movie);
    
    logger.debug('📄 Movie data fetched and structured', {
      nodeId,
      movieTitle: movie.title,
      movieYear: movie.year,
      genreCount: movie.genre.length,
      progress: `${i + 1}/${batchSize}`
    });
  }

  logger.info('📦 Movie batch discovery and fetching completed', {
    nodeId,
    totalMoviesFound: selectedMovies.length,
    batchSize: selectedMovies.length,
    averageRating: (selectedMovies.reduce((sum, m) => sum + m.rating, 0) / selectedMovies.length).toFixed(1),
    genreDistribution: [...new Set(selectedMovies.flatMap(m => m.genre))]
  });

  logNodeExecution(nodeId, 'discover_and_fetch_movie_batch', startTime, {
    moviesDiscovered: selectedMovies.length,
    httpRequestsMade: selectedMovies.length + 1,
    dataStructured: true,
    batchQuality: 'good'
  });

  return {
    discoveredMoviesBatch: selectedMovies
  };
}
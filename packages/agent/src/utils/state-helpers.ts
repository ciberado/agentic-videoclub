import type { VideoRecommendationAgentStateType } from '../state/definition';
import type { Movie, MovieLink, ProcessedMovie } from '../types';

/**
 * State helper utilities for improved movie data structure
 * Provides backwards compatibility and convenience methods
 */

/**
 * Get all processed movies as Movie[] for backwards compatibility
 */
export function getAllDiscoveredMovies(state: VideoRecommendationAgentStateType): Movie[] {
  return (state.processedMovies || []).map(pm => pm.movie);
}

/**
 * Get current batch of movies for evaluation
 */
export function getCurrentMovieBatch(state: VideoRecommendationAgentStateType): Movie[] {
  const allMovies = getAllDiscoveredMovies(state);
  const offset = state.movieBatchOffset || 0;
  const size = state.movieBatchSize || 10;
  return allMovies.slice(offset, offset + size);
}

/**
 * Add processed movies to the state
 */
export function addProcessedMovies(
  state: VideoRecommendationAgentStateType, 
  movies: Movie[], 
  urls: string[], 
  source: 'initial_discovery' | 'related_movie' | 'recursive_discovery'
): ProcessedMovie[] {
  const newProcessedMovies: ProcessedMovie[] = movies.map((movie, index) => ({
    movie,
    url: urls[index] || `unknown-${Date.now()}-${index}`,
    source,
    processedAt: new Date()
  }));
  
  return [...(state.processedMovies || []), ...newProcessedMovies];
}

/**
 * Add movie links to the queue
 */
export function addMovieLinks(
  state: VideoRecommendationAgentStateType,
  links: {title: string, url: string}[],
  source: 'initial_discovery' | 'related_movie' | 'recursive_discovery'
): MovieLink[] {
  const processedUrls = state.processedUrls || new Set<string>();
  const existingUrls = new Set((state.movieLinksQueue || []).map(link => link.url));
  
  const newLinks: MovieLink[] = links
    .filter(link => !processedUrls.has(link.url) && !existingUrls.has(link.url))
    .map(link => ({
      ...link,
      source,
      addedAt: new Date()
    }));
    
  return [...(state.movieLinksQueue || []), ...newLinks];
}

/**
 * Get next batch of links to process
 */
export function getNextLinksBatch(
  state: VideoRecommendationAgentStateType,
  batchSize: number = 10
): MovieLink[] {
  return (state.movieLinksQueue || []).slice(0, batchSize);
}

/**
 * Remove processed links from the queue
 */
export function removeProcessedLinks(
  state: VideoRecommendationAgentStateType,
  processedUrls: string[]
): MovieLink[] {
  const urlSet = new Set(processedUrls);
  return (state.movieLinksQueue || []).filter(link => !urlSet.has(link.url));
}

/**
 * Check if a URL has already been processed
 */
export function isUrlProcessed(state: VideoRecommendationAgentStateType, url: string): boolean {
  return (state.processedUrls || new Set()).has(url);
}

/**
 * Get statistics about the current state
 */
export function getDiscoveryStats(state: VideoRecommendationAgentStateType) {
  const processedMovies = state.processedMovies || [];
  const queuedLinks = state.movieLinksQueue || [];
  
  return {
    totalProcessed: processedMovies.length,
    totalQueued: queuedLinks.length,
    bySource: {
      initial: processedMovies.filter(pm => pm.source === 'initial_discovery').length,
      related: processedMovies.filter(pm => pm.source === 'related_movie').length,
      recursive: processedMovies.filter(pm => pm.source === 'recursive_discovery').length
    },
    queuedBySource: {
      initial: queuedLinks.filter(link => link.source === 'initial_discovery').length,
      related: queuedLinks.filter(link => link.source === 'related_movie').length,
      recursive: queuedLinks.filter(link => link.source === 'recursive_discovery').length
    },
    currentDepth: state.discoveryDepth || 0,
    maxDepth: state.maxDiscoveryDepth || 2
  };
}
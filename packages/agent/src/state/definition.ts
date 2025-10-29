import { Annotation } from '@langchain/langgraph';
import type { UserCriteria, MovieEvaluation, Movie, MovieLink, ProcessedMovie } from '../types';

// Define the state using modern Annotation pattern
export const VideoRecommendationAgentState = Annotation.Root({
  // Input from user
  userInput: Annotation<string>,
  
  // Enhanced criteria from prompt enhancement node
  enhancedUserCriteria: Annotation<UserCriteria | null>,
  
  // Movie discovery and pagination state
  processedMovies: Annotation<ProcessedMovie[]>, // All movies that have been fetched and normalized
  discoveredMoviesBatch: Annotation<Movie[]>, // Current batch for evaluation
  movieBatchOffset: Annotation<number>, // Current position in processed movies
  movieBatchSize: Annotation<number>, // How many movies to send to evaluation per batch
  
  // Movie link queue state (lightweight queue for unprocessed movies)
  movieLinksQueue: Annotation<MovieLink[]>, // Queue of movie links to process
  processedUrls: Annotation<Set<string>>, // Fast O(1) lookup for processed URLs
  discoveryDepth: Annotation<number>, // Current recursion depth
  maxDiscoveryDepth: Annotation<number>, // Maximum recursion depth allowed
  
  // Evaluation results
  evaluatedMoviesBatch: Annotation<MovieEvaluation[]>, // Current batch evaluations
  allAcceptableCandidates: Annotation<MovieEvaluation[]>, // All good candidates so far
  qualityGatePassedSuccessfully: Annotation<boolean>,
  highConfidenceMatchCount: Annotation<number>,
  minimumAcceptableCandidates: Annotation<number>, // Minimum Y candidates needed
  
  // Control flow state
  searchAttemptNumber: Annotation<number>,
  maximumSearchAttempts: Annotation<number>,
  finalRecommendations: Annotation<MovieEvaluation[]>,
  workflowCompleted: Annotation<boolean>,
  
  // Error handling
  lastErrorMessage: Annotation<string | undefined>,
  
  // Token usage tracking
  totalTokensConsumed: Annotation<number>,
});

export type VideoRecommendationAgentStateType = typeof VideoRecommendationAgentState.State;
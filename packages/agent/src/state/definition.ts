import { Annotation } from '@langchain/langgraph';
import type { UserCriteria, MovieEvaluation, Movie } from '../types';

// Define the state using modern Annotation pattern
export const VideoRecommendationAgentState = Annotation.Root({
  // Input from user
  userInput: Annotation<string>,
  
  // Enhanced criteria from prompt enhancement node
  enhancedUserCriteria: Annotation<UserCriteria | null>,
  
  // Movies discovered and fetched
  discoveredMoviesBatch: Annotation<Movie[]>,
  
  // Evaluation results
  evaluatedMoviesBatch: Annotation<MovieEvaluation[]>,
  qualityGatePassedSuccessfully: Annotation<boolean>,
  highConfidenceMatchCount: Annotation<number>,
  
  // Control flow state
  searchAttemptNumber: Annotation<number>,
  maximumSearchAttempts: Annotation<number>,
  finalRecommendations: Annotation<MovieEvaluation[]>,
  
  // Error handling
  lastErrorMessage: Annotation<string | undefined>,
});

export type VideoRecommendationAgentStateType = typeof VideoRecommendationAgentState.State;
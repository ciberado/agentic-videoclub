// Load environment variables from .env file
import 'dotenv/config';

import { StateGraph, START } from '@langchain/langgraph';
import logger from './config/logger';

// Import from modular structure
import { VideoRecommendationAgentState } from './state/definition';
import { promptEnhancementNode } from './nodes/prompt-enhancement';
import { movieDiscoveryAndDataFetchingNode } from './nodes/movie-discovery';
import { intelligentEvaluationNode } from './nodes/evaluation';
import { batchControlAndRoutingNode } from './nodes/batch-control';
import { shouldContinueSearching } from './routing/flow-control';
import type { MovieEvaluation } from './types';




// ===== LANGGRAPH WORKFLOW DEFINITION =====

const videoRecommendationWorkflow = new StateGraph(VideoRecommendationAgentState)
  .addNode('prompt_enhancement_node', promptEnhancementNode)
  .addNode('movie_discovery_and_data_fetching_node', movieDiscoveryAndDataFetchingNode)
  .addNode('intelligent_evaluation_node', intelligentEvaluationNode)
  .addNode('batch_control_and_routing_node', batchControlAndRoutingNode)
  .addEdge(START, 'prompt_enhancement_node')
  .addEdge('prompt_enhancement_node', 'movie_discovery_and_data_fetching_node')
  .addEdge('movie_discovery_and_data_fetching_node', 'intelligent_evaluation_node')
  .addConditionalEdges('intelligent_evaluation_node', shouldContinueSearching)
  .addConditionalEdges('batch_control_and_routing_node', shouldContinueSearching);

const compiledVideoRecommendationAgent = videoRecommendationWorkflow.compile();

// ===== MAIN EXECUTION =====

async function runVideoRecommendationAgent(userInput: string) {
  logger.info('🚀 Video Recommendation Agent starting up', {
    version: '0.0.1',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'debug',
    userInput: userInput
  });

  const initialState: typeof VideoRecommendationAgentState.State = {
    userInput,
    enhancedUserCriteria: null,
    
    // Movie discovery - clean improved structure
    processedMovies: [],
    discoveredMoviesBatch: [],
    movieBatchOffset: 0,
    movieBatchSize: 10, // X movies per batch
    
    // Movie links queue - lightweight tracking
    movieLinksQueue: [],
    processedUrls: new Set<string>(),
    discoveryDepth: 0,
    maxDiscoveryDepth: 2,
    
    // Evaluation results
    evaluatedMoviesBatch: [],
    allAcceptableCandidates: [],
    qualityGatePassedSuccessfully: false,
    highConfidenceMatchCount: 0,
    minimumAcceptableCandidates: 5, // Y minimum acceptable candidates
    
    // Control flow state
    searchAttemptNumber: 1,
    maximumSearchAttempts: 3,
    finalRecommendations: [],
    workflowCompleted: false,
    
    // Error handling
    lastErrorMessage: undefined
  };

  try {
    const finalState = await compiledVideoRecommendationAgent.invoke(initialState, {
      recursionLimit: 50 // Increase from default 25 to handle batch processing
    } as any);
    
    logger.info('🎉 Video Recommendation Agent completed successfully', {
      totalSearchAttempts: finalState.searchAttemptNumber,
      finalRecommendationsCount: finalState.finalRecommendations.length,
      qualityGateStatus: finalState.qualityGatePassedSuccessfully ? 'PASSED' : 'COMPLETED_WITH_BEST_EFFORT'
    });

    // Display final recommendations
    console.log('\n🎬 FINAL MOVIE RECOMMENDATIONS:');
    console.log('================================');
    finalState.finalRecommendations.forEach((rec: MovieEvaluation, index: number) => {
      console.log(`${index + 1}. "${rec.movie.title}" (${rec.movie.year})`);
      console.log(`   Director: ${rec.movie.director}`);
      console.log(`   Genres: ${rec.movie.genre.join(', ')}`);
      console.log(`   Rating: ${rec.movie.rating}/10`);
      console.log(`   Confidence: ${(rec.confidenceScore * 100).toFixed(1)}%`);
      console.log(`   Description: ${rec.movie.description || 'No description available'}`);
      console.log(`   Reasoning: ${rec.matchReasoning}`);
      console.log('');
    });

    return finalState;

  } catch (error) {
    logger.error('💥 Video Recommendation Agent failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Export the main function and types for testing
export { runVideoRecommendationAgent };
export type { MovieEvaluation } from './types';
export type { VideoRecommendationAgentStateType } from './state/definition';

// Run the agent with example input only when this file is executed directly
if (require.main === module) {
  const exampleUserInput = "I'm a 49 years old guy that loves science fiction and hates cheesy stories. I would like to find movies to watch with my family.";

  runVideoRecommendationAgent(exampleUserInput)
    .then(() => {
      logger.info('🎯 Agent execution completed successfully - exiting process');
      process.exit(0);
    })
    .catch(error => {
      console.error('Agent execution failed:', error);
      process.exit(1);
    });
}
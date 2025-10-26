import { StateGraph, START, END } from '@langchain/langgraph';
import logger from './config/logger';
import { 
  logNodeStart, 
  logNodeExecution, 
  logHttpRequest, 
  logHttpResponse,
  logLlmRequest,
  logLlmResponse,
  logEvaluationBatch,
  logQualityGate,
  logSearchAdaptation
} from './utils/logging';

// ===== TYPE DEFINITIONS =====

interface UserCriteria {
  originalInput: string;
  enhancedGenres: string[];
  excludeGenres: string[];
  ageGroup: string;
  familyFriendly: boolean;
  preferredThemes: string[];
  avoidThemes: string[];
  searchTerms: string[];
}

interface Movie {
  title: string;
  year: number;
  genre: string[];
  rating: number;
  director: string;
  description: string;
  familyRating: string;
  themes: string[];
}

interface MovieEvaluation {
  movie: Movie;
  confidenceScore: number;
  matchReasoning: string;
  familyAppropriate: boolean;
}

interface VideoRecommendationAgentState {
  // Input from user
  userInput: string;
  
  // Enhanced criteria from prompt enhancement node
  enhancedUserCriteria: UserCriteria | null;
  
  // Movies discovered and fetched
  discoveredMoviesBatch: Movie[];
  
  // Evaluation results
  evaluatedMoviesBatch: MovieEvaluation[];
  qualityGatePassedSuccessfully: boolean;
  highConfidenceMatchCount: number;
  
  // Control flow state
  searchAttemptNumber: number;
  maximumSearchAttempts: number;
  finalRecommendations: MovieEvaluation[];
  
  // Error handling
  lastErrorMessage?: string;
}

// ===== FAKE DATA GENERATORS =====

const fakeMovieDatabase = [
  {
    title: "Blade Runner 2049",
    year: 2017,
    genre: ["Science Fiction", "Drama", "Thriller"],
    rating: 8.0,
    director: "Denis Villeneuve",
    description: "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard.",
    familyRating: "R",
    themes: ["Artificial Intelligence", "Identity", "Future dystopia", "Philosophical"]
  },
  {
    title: "Arrival",
    year: 2016,
    genre: ["Science Fiction", "Drama"],
    rating: 7.9,
    director: "Denis Villeneuve",
    description: "A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft land around the world.",
    familyRating: "PG-13",
    themes: ["Communication", "Time", "Language", "First contact"]
  },
  {
    title: "Interstellar",
    year: 2014,
    genre: ["Science Fiction", "Drama", "Adventure"],
    rating: 8.6,
    director: "Christopher Nolan",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    familyRating: "PG-13",
    themes: ["Space exploration", "Time dilation", "Family bonds", "Survival"]
  },
  {
    title: "The Martian",
    year: 2015,
    genre: ["Science Fiction", "Drama", "Adventure"],
    rating: 8.0,
    director: "Ridley Scott",
    description: "An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to find a way to signal to Earth.",
    familyRating: "PG-13",
    themes: ["Survival", "Problem solving", "Optimism", "Science"]
  },
  {
    title: "Ex Machina",
    year: 2014,
    genre: ["Science Fiction", "Drama", "Thriller"],
    rating: 7.7,
    director: "Alex Garland",
    description: "A young programmer is selected to participate in a ground-breaking experiment in synthetic intelligence.",
    familyRating: "R",
    themes: ["Artificial Intelligence", "Consciousness", "Manipulation", "Ethics"]
  },
  {
    title: "Ready Player One",
    year: 2018,
    genre: ["Science Fiction", "Adventure", "Action"],
    rating: 7.4,
    director: "Steven Spielberg",
    description: "When the creator of a virtual reality world dies, he releases a video challenge to all users.",
    familyRating: "PG-13",
    themes: ["Virtual reality", "Gaming", "Pop culture", "Adventure"]
  },
  {
    title: "Star Wars: A New Hope",
    year: 1977,
    genre: ["Science Fiction", "Adventure", "Fantasy"],
    rating: 8.6,
    director: "George Lucas",
    description: "Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy.",
    familyRating: "PG",
    themes: ["Good vs evil", "Coming of age", "Space opera", "Adventure"]
  },
  {
    title: "The Matrix",
    year: 1999,
    genre: ["Science Fiction", "Action"],
    rating: 8.7,
    director: "Lana Wachowski, Lilly Wachowski",
    description: "A computer hacker learns from mysterious rebels about the true nature of his reality.",
    familyRating: "R",
    themes: ["Reality vs simulation", "Rebellion", "Philosophy", "Action"]
  },
  {
    title: "WALL-E",
    year: 2008,
    genre: ["Animation", "Science Fiction", "Family"],
    rating: 8.4,
    director: "Andrew Stanton",
    description: "In the distant future, a small waste-collecting robot inadvertently embarks on a space journey.",
    familyRating: "G",
    themes: ["Environmental", "Love", "Technology", "Hope"]
  },
  {
    title: "Gravity",
    year: 2013,
    genre: ["Science Fiction", "Thriller", "Drama"],
    rating: 7.7,
    director: "Alfonso Cuarón",
    description: "Two astronauts work together to survive after an accident leaves them stranded in space.",
    familyRating: "PG-13",
    themes: ["Survival", "Isolation", "Resilience", "Space"]
  }
];

// ===== NODE IMPLEMENTATIONS =====

async function promptEnhancementNode(state: VideoRecommendationAgentState): Promise<Partial<VideoRecommendationAgentState>> {
  const nodeId = 'prompt_enhancement_node';
  const startTime = logNodeStart(nodeId, 'enhance_user_input', { userInput: state.userInput });
  
  logger.info('🎯 Starting prompt enhancement analysis', { 
    nodeId,
    originalInput: state.userInput,
    inputLength: state.userInput.length 
  });

  // Simulate LLM analysis of user input
  logLlmRequest('claude-3-haiku', `Analyze user preferences: "${state.userInput}"`, 450);
  await new Promise(resolve => setTimeout(resolve, 150)); // Simulate LLM processing time
  
  // Generate fake enhanced criteria based on the input
  const enhancedCriteria: UserCriteria = {
    originalInput: state.userInput,
    enhancedGenres: ["Science Fiction", "Drama", "Thriller"],
    excludeGenres: ["Romance", "Comedy", "Musical", "Horror"],
    ageGroup: "Adult",
    familyFriendly: state.userInput.toLowerCase().includes('family'),
    preferredThemes: ["Hard sci-fi", "Philosophical", "Future dystopia", "Space exploration"],
    avoidThemes: ["Cheesy dialogue", "Romantic subplots", "Slapstick humor", "Overly dramatic"],
    searchTerms: ["science fiction", "intelligent sci-fi", "adult sci-fi", "serious sci-fi"]
  };
  
  logLlmResponse('claude-3-haiku', 'Enhanced user criteria with genre mapping and theme analysis', 280, 150);
  
  logger.info('✨ Prompt enhancement completed successfully', {
    nodeId,
    enhancedGenresCount: enhancedCriteria.enhancedGenres.length,
    excludedGenresCount: enhancedCriteria.excludeGenres.length,
    familyFriendly: enhancedCriteria.familyFriendly,
    searchTermsGenerated: enhancedCriteria.searchTerms.length
  });

  logNodeExecution(nodeId, 'enhance_user_input', startTime, {
    enhancedGenres: enhancedCriteria.enhancedGenres,
    excludeGenres: enhancedCriteria.excludeGenres,
    familyContext: enhancedCriteria.familyFriendly,
    themePreferences: enhancedCriteria.preferredThemes.length
  });

  return {
    enhancedUserCriteria: enhancedCriteria
  };
}

async function movieDiscoveryAndDataFetchingNode(state: VideoRecommendationAgentState): Promise<Partial<VideoRecommendationAgentState>> {
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
  const searchUrl = 'https://fake-movie-database.com/search';
  const searchParams = state.enhancedUserCriteria?.searchTerms.join('+') || 'sci-fi';
  
  logHttpRequest(`${searchUrl}?genre=${searchParams}&limit=15`, 'GET');
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate HTTP delay
  logHttpResponse(`${searchUrl}?genre=${searchParams}&limit=15`, 200, 200, 25600);

  // Simulate recursive data fetching for movie details
  const batchSize = 10 + Math.floor(Math.random() * 5); // 10-14 movies per batch
  const selectedMovies: Movie[] = [];
  
  for (let i = 0; i < Math.min(batchSize, fakeMovieDatabase.length); i++) {
    const movie = fakeMovieDatabase[i];
    
    // Simulate fetching detailed movie information
    const detailUrl = `https://fake-movie-database.com/movie/${movie.title.toLowerCase().replace(/\s+/g, '-')}`;
    logHttpRequest(detailUrl, 'GET');
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate detail fetch delay
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

async function intelligentEvaluationNode(state: VideoRecommendationAgentState): Promise<Partial<VideoRecommendationAgentState>> {
  const nodeId = 'intelligent_evaluation_node';
  const startTime = logNodeStart(nodeId, 'evaluate_movie_batch_quality', {
    batchSize: state.discoveredMoviesBatch.length,
    userCriteria: state.enhancedUserCriteria
  });

  logger.info('🧠 Starting intelligent batch evaluation', {
    nodeId,
    batchSize: state.discoveredMoviesBatch.length,
    targetGenres: state.enhancedUserCriteria?.enhancedGenres,
    familyFriendly: state.enhancedUserCriteria?.familyFriendly,
    evaluationThemes: state.enhancedUserCriteria?.preferredThemes
  });

  // Simulate LLM evaluation of the movie batch
  const evaluationPrompt = `Evaluate ${state.discoveredMoviesBatch.length} movies for user preferences...`;
  logLlmRequest('claude-3-haiku', evaluationPrompt, 1200);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate LLM evaluation time

  const evaluatedMovies: MovieEvaluation[] = [];
  let totalScore = 0;

  // Evaluate each movie with fake but realistic scoring
  for (const movie of state.discoveredMoviesBatch) {
    // Generate realistic confidence scores based on movie characteristics
    let confidenceScore = 0.5; // Base score
    
    // Boost score for preferred genres
    if (state.enhancedUserCriteria?.enhancedGenres.some(genre => movie.genre.includes(genre))) {
      confidenceScore += 0.3;
    }
    
    // Boost for family-appropriate content if needed
    if (state.enhancedUserCriteria?.familyFriendly && ['G', 'PG', 'PG-13'].includes(movie.familyRating)) {
      confidenceScore += 0.2;
    }
    
    // Reduce score for excluded genres
    if (state.enhancedUserCriteria?.excludeGenres.some(genre => movie.genre.includes(genre))) {
      confidenceScore -= 0.2;
    }
    
    // Add some randomness but keep within realistic bounds
    confidenceScore += (Math.random() - 0.5) * 0.3;
    confidenceScore = Math.max(0.1, Math.min(0.95, confidenceScore));
    
    const evaluation: MovieEvaluation = {
      movie,
      confidenceScore,
      matchReasoning: generateFakeReasoning(movie, state.enhancedUserCriteria!, confidenceScore),
      familyAppropriate: ['G', 'PG', 'PG-13'].includes(movie.familyRating)
    };
    
    evaluatedMovies.push(evaluation);
    totalScore += confidenceScore;
    
    logger.debug('🎯 Movie evaluation completed', {
      nodeId,
      movieTitle: movie.title,
      confidenceScore: confidenceScore.toFixed(2),
      familyAppropriate: evaluation.familyAppropriate,
      matchingGenres: movie.genre.filter(g => state.enhancedUserCriteria?.enhancedGenres.includes(g))
    });
  }

  const averageScore = totalScore / evaluatedMovies.length;
  const highConfidenceThreshold = 0.7;
  const highConfidenceMatches = evaluatedMovies.filter(e => e.confidenceScore >= highConfidenceThreshold);
  const qualityGateThreshold = 3;
  const qualityGatePassed = highConfidenceMatches.length >= qualityGateThreshold;

  logLlmResponse('claude-3-haiku', `Batch evaluation complete with ${evaluatedMovies.length} scored movies`, 800, 300);

  // Log evaluation results
  logEvaluationBatch(evaluatedMovies.length, qualityGatePassed, highConfidenceMatches.length, averageScore * 10);
  logQualityGate(qualityGatePassed, qualityGateThreshold, highConfidenceMatches.length, evaluatedMovies.length);

  logger.info('📊 Intelligent evaluation completed', {
    nodeId,
    totalMoviesEvaluated: evaluatedMovies.length,
    averageConfidenceScore: averageScore.toFixed(2),
    highConfidenceMatches: highConfidenceMatches.length,
    qualityGateStatus: qualityGatePassed ? 'PASSED' : 'FAILED',
    qualityGateThreshold: qualityGateThreshold,
    topMovie: evaluatedMovies.sort((a, b) => b.confidenceScore - a.confidenceScore)[0]?.movie.title
  });

  logNodeExecution(nodeId, 'evaluate_movie_batch_quality', startTime, {
    moviesEvaluated: evaluatedMovies.length,
    averageScore: averageScore.toFixed(2),
    highConfidenceCount: highConfidenceMatches.length,
    qualityGatePassed,
    evaluationQuality: 'comprehensive'
  });

  return {
    evaluatedMoviesBatch: evaluatedMovies,
    qualityGatePassedSuccessfully: qualityGatePassed,
    highConfidenceMatchCount: highConfidenceMatches.length
  };
}

async function batchControlAndRoutingNode(state: VideoRecommendationAgentState): Promise<Partial<VideoRecommendationAgentState>> {
  const nodeId = 'batch_control_and_routing_node';
  const startTime = logNodeStart(nodeId, 'control_batch_flow_and_routing', {
    qualityGatePassed: state.qualityGatePassedSuccessfully,
    searchAttempt: state.searchAttemptNumber,
    maxAttempts: state.maximumSearchAttempts
  });

  logger.info('🎯 Starting batch control and routing analysis', {
    nodeId,
    qualityGatePassed: state.qualityGatePassedSuccessfully,
    currentAttempt: state.searchAttemptNumber,
    maxAttempts: state.maximumSearchAttempts,
    highConfidenceMatches: state.highConfidenceMatchCount
  });

  let finalRecommendations: MovieEvaluation[] = [];
  let searchAttemptNumber = state.searchAttemptNumber;

  if (state.qualityGatePassedSuccessfully) {
    // SUCCESS PATH: Quality gate passed, compile final recommendations
    logger.info('✅ Quality gate PASSED - Compiling final recommendations', {
      nodeId,
      highConfidenceMatches: state.highConfidenceMatchCount,
      totalEvaluated: state.evaluatedMoviesBatch.length
    });

    // Sort by confidence score and take top recommendations
    finalRecommendations = state.evaluatedMoviesBatch
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 5); // Top 5 recommendations

    logger.info('🏆 Final recommendations compiled successfully', {
      nodeId,
      recommendationCount: finalRecommendations.length,
      topRecommendation: finalRecommendations[0]?.movie.title,
      averageConfidence: (finalRecommendations.reduce((sum, r) => sum + r.confidenceScore, 0) / finalRecommendations.length).toFixed(2)
    });

  } else if (state.searchAttemptNumber < state.maximumSearchAttempts) {
    // RETRY PATH: Quality gate failed, but we can try again
    searchAttemptNumber = state.searchAttemptNumber + 1;
    
    logger.warn('⚠️ Quality gate FAILED - Triggering search strategy adaptation', {
      nodeId,
      currentAttempt: state.searchAttemptNumber,
      nextAttempt: searchAttemptNumber,
      highConfidenceMatches: state.highConfidenceMatchCount,
      requiredMatches: 3
    });

    // Simulate adaptive search strategy modification
    const originalCriteria = state.enhancedUserCriteria;
    const adaptedCriteria = {
      ...originalCriteria!,
      enhancedGenres: [...originalCriteria!.enhancedGenres, "Adventure", "Action"], // Expand genres
      searchTerms: [...originalCriteria!.searchTerms, "popular sci-fi", "award-winning sci-fi"] // Broaden search
    };

    logSearchAdaptation(
      searchAttemptNumber,
      originalCriteria,
      adaptedCriteria,
      'Expanding genre criteria and search terms to find more matches'
    );

    logger.info('🔄 Search strategy adapted for next iteration', {
      nodeId,
      newAttemptNumber: searchAttemptNumber,
      expandedGenres: adaptedCriteria.enhancedGenres,
      newSearchTerms: adaptedCriteria.searchTerms,
      adaptationReason: 'insufficient_quality_matches'
    });

  } else {
    // MAX ATTEMPTS REACHED: Return best available results
    logger.warn('🛑 Maximum search attempts reached - Returning best available results', {
      nodeId,
      attemptsUsed: state.searchAttemptNumber,
      maxAttempts: state.maximumSearchAttempts,
      bestAvailableCount: state.evaluatedMoviesBatch.length
    });

    // Return the best movies we found, even if they don't meet the quality threshold
    finalRecommendations = state.evaluatedMoviesBatch
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 3); // At least 3 recommendations

    logger.info('📋 Best available recommendations compiled', {
      nodeId,
      recommendationCount: finalRecommendations.length,
      averageQuality: 'below_threshold_but_best_available',
      topRecommendation: finalRecommendations[0]?.movie.title
    });
  }

  logNodeExecution(nodeId, 'control_batch_flow_and_routing', startTime, {
    routingDecision: state.qualityGatePassedSuccessfully ? 'SUCCESS' : 
                    (searchAttemptNumber <= state.maximumSearchAttempts ? 'RETRY' : 'MAX_ATTEMPTS'),
    finalRecommendationsCount: finalRecommendations.length,
    nextSearchAttempt: searchAttemptNumber,
    flowComplete: finalRecommendations.length > 0
  });

  return {
    finalRecommendations,
    searchAttemptNumber
  };
}

// Helper function to generate fake reasoning
function generateFakeReasoning(movie: Movie, criteria: UserCriteria, score: number): string {
  const reasons = [];
  
  if (score >= 0.8) {
    reasons.push(`Excellent match for ${criteria.ageGroup.toLowerCase()} sci-fi preferences`);
  } else if (score >= 0.6) {
    reasons.push(`Good alignment with specified themes`);
  } else {
    reasons.push(`Partial match but may lack some preferred elements`);
  }
  
  if (movie.genre.some(g => criteria.enhancedGenres.includes(g))) {
    reasons.push(`matches preferred genres: ${movie.genre.join(', ')}`);
  }
  
  if (criteria.familyFriendly && ['G', 'PG', 'PG-13'].includes(movie.familyRating)) {
    reasons.push(`family-appropriate rating (${movie.familyRating})`);
  }
  
  return reasons.join('; ');
}

// ===== ROUTING LOGIC =====

function shouldContinueSearching(state: VideoRecommendationAgentState): string {
  logger.debug('🔀 Evaluating routing decision', {
    qualityGatePassed: state.qualityGatePassedSuccessfully,
    searchAttempt: state.searchAttemptNumber,
    maxAttempts: state.maximumSearchAttempts,
    hasFinalRecommendations: state.finalRecommendations.length > 0
  });

  // If we have final recommendations, we're done
  if (state.finalRecommendations.length > 0) {
    logger.info('✅ Routing to END - Final recommendations ready', {
      recommendationCount: state.finalRecommendations.length
    });
    return END;
  }

  // If quality gate passed OR max attempts reached, go to batch control
  if (state.qualityGatePassedSuccessfully || state.searchAttemptNumber >= state.maximumSearchAttempts) {
    logger.info('🎯 Routing to batch_control_and_routing_node', {
      reason: state.qualityGatePassedSuccessfully ? 'quality_gate_passed' : 'max_attempts_reached'
    });
    return 'batch_control_and_routing_node';
  }

  // Continue the search loop
  logger.info('🔄 Routing to movie_discovery_and_data_fetching_node - Continuing search', {
    nextAttempt: state.searchAttemptNumber + 1
  });
  return 'movie_discovery_and_data_fetching_node';
}

// ===== LANGGRAPH WORKFLOW DEFINITION =====

const videoRecommendationWorkflow = new StateGraph<VideoRecommendationAgentState>({
  channels: {
    userInput: null,
    enhancedUserCriteria: null,
    discoveredMoviesBatch: null,
    evaluatedMoviesBatch: null,
    qualityGatePassedSuccessfully: null,
    highConfidenceMatchCount: null,
    searchAttemptNumber: null,
    maximumSearchAttempts: null,
    finalRecommendations: null,
    lastErrorMessage: null
  }
})
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

  const initialState: VideoRecommendationAgentState = {
    userInput,
    enhancedUserCriteria: null,
    discoveredMoviesBatch: [],
    evaluatedMoviesBatch: [],
    qualityGatePassedSuccessfully: false,
    highConfidenceMatchCount: 0,
    searchAttemptNumber: 1,
    maximumSearchAttempts: 3,
    finalRecommendations: []
  };

  try {
    const finalState = await compiledVideoRecommendationAgent.invoke(initialState);
    
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
export type { VideoRecommendationAgentState, MovieEvaluation };

// Run the agent with example input only when this file is executed directly
if (require.main === module) {
  const exampleUserInput = "I'm a 49 years old guy that loves science fiction and hates cheesy stories. I would like to find movies to watch with my family.";

  runVideoRecommendationAgent(exampleUserInput).catch(error => {
    console.error('Agent execution failed:', error);
    process.exit(1);
  });
}
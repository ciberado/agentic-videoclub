# Video Recommendation Agent - Design Document (Current Implementation)

## Overview

This document outlines the architectural decisions for building a production-ready video recommendation agent using modern LangGraph.js v1 and TypeScript. The agent implements a sophisticated 4-node workflow with pagination-based processing that handles natural language user requests through intelligent prompt enhancement, web scraping-based movie discovery, LLM-powered batch evaluation, and adaptive candidate accumulation.

**Production Focus**: This implementation features real AWS Bedrock integration, live web scraping of Prime Video, SQLite database caching, comprehensive token consumption tracking, and enterprise-grade logging to demonstrate production-ready LangGraph agent patterns with actual external service integrations.

**Token Monitoring**: The system includes comprehensive token consumption tracking across all LLM operations, providing visibility into resource usage with detailed breakdowns of input/output tokens, operation counts, and cost analysis for production optimization.

## System Architecture

### High-Level Flow
The agent follows a 4-node architecture with pagination-based candidate accumulation and intelligent routing:

1. **Prompt Enhancement** → 2. **Movie Discovery & Data Fetching** → 3. **Intelligent Evaluation** → 4. **Flow Control & Candidate Accumulation**

The system processes movies in paginated batches, accumulating acceptable candidates until it reaches the minimum required recommendations (default: 5) or exhausts all available movies.

### Architecture Diagram

```mermaid
graph TD
    A["User Input: 49yo sci-fi fan, hates cheesy stories, family movie night"] --> B[Prompt Enhancement Node]
    
    B --> |"Enhanced Criteria: Genres, themes, family-friendly"| C[Movie Discovery & Web Scraping Node]
    
    C --> |"Batch of Movies (offset-based pagination)"| D[Intelligent Evaluation Node]
    
    D --> |"Evaluated Movies with Confidence Scores"| E[Flow Control & Routing Node]
    
    E --> |"Accumulate acceptable candidates (≥0.6 confidence)"| F[Candidate Pool]
    
    E --> |"Need more candidates + movies available"| G[Next Batch]
    G --> |"Increment batch offset"| C
    
    E --> |"Sufficient candidates (≥5) OR movies exhausted"| H[Batch Control Node]
    
    H --> |"Compile top 5 recommendations"| I[Final Recommendations]
    
    E --> |"Max attempts reached"| J[Best Available Results]
    
    style B fill:#e1f5fe
    style C fill:#f3e5f5
    style D fill:#e8f5e8
    style E fill:#fff3e0
    style H fill:#fff3e0
    style I fill:#e8f5e8
    
    classDef llmNode fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef webScraping fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef evaluation fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef routing fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class B llmNode
    class C webScraping
    class D evaluation
    class E,H routing
```

### Node Design Decisions

#### 1. Prompt Enhancement Node (`prompt_enhancement_node`)
**Responsibility**: Natural language processing and context enrichment with token tracking
- **LLM Analysis**: Interprets user's natural language description using Claude 3 Haiku for fast, cost-effective analysis
- **Context Expansion**: Adds demographic insights, genre mappings, and comprehensive preference clarifications
- **Search Strategy**: Generates specific search terms, filters, and quality criteria optimized for Prime Video discovery
- **Family Context**: Identifies family-appropriate content requirements and content rating preferences
- **Token Monitoring**: Tracks input/output tokens for cost analysis (~500-800 tokens per operation)
- **Design Choice**: Front-loads intelligence to improve downstream search accuracy while monitoring resource consumption

**Example Enhancement**:
```
Input: "I'm a 49 years old guy that loves science fiction and hates cheesy stories"
Enhanced Output: {
  genres: ["Science Fiction", "Thriller", "Drama", "Action", "Adventure"],
  excludeGenres: ["Romance Comedy", "Melodrama", "Slapstick Comedy", "Parody"],
  ageGroup: "Adult",
  familyFriendly: true,
  preferredThemes: ["Intelligent plots", "Thought-provoking", "Action-packed"],
  avoidThemes: ["Predictable plots", "Clichéd storylines"],
  searchTerms: ["family-friendly sci-fi", "intelligent action"]
}
```

#### 2. Movie Discovery & Data Fetching Node (`movie_discovery_and_data_fetching_node`)
**Responsibility**: Prime Video web scraping with intelligent caching, pagination, and token tracking
- **Web Scraping**: Real-time scraping of Prime Video movie listings using Cheerio HTML parser with simplified text extraction
- **Cache Integration**: SQLite database caching achieving 100% cache hit rates for optimal performance
- **Batch Processing**: Pagination-based processing with configurable batch sizes (default: 10 movies)
- **LLM Normalization**: Claude 3 Haiku-powered metadata standardization and theme extraction with token monitoring
- **Rate Limiting**: Proper headers and delays to avoid detection while respecting service resources
- **Structured Output**: Converts raw scraped data into typed Movie objects with comprehensive metadata
- **Token Tracking**: Monitors normalization operations for cost analysis and performance optimization
- **Design Choice**: Real web scraping combined with intelligent caching and resource monitoring for production reliability

#### 3. Intelligent Evaluation Node (`intelligent_evaluation_node`)
**Responsibility**: Claude 3.5 Sonnet-powered movie evaluation with comprehensive quality assessment and token tracking
- **Parallel Batch Evaluation**: Evaluates current movie batch against enhanced user criteria using Promise.allSettled for optimal performance
- **Multi-Dimensional Analysis**: Advanced reasoning across genre alignment, theme matching, age appropriateness, quality indicators, and cultural relevance
- **Confidence Scoring**: Generates 0.0-1.0 confidence scores with detailed reasoning explanations (typically 75-85% for high matches)
- **Quality Gate Optimization**: Uses ≥0.75 confidence threshold for high-quality matches (optimized from previous 0.6 threshold)
- **Family Appropriateness**: Comprehensive content suitability assessment for family viewing contexts
- **Candidate Filtering**: Identifies acceptable candidates (≥0.75 confidence) for accumulation in candidate pool
- **Token Monitoring**: Comprehensive tracking of Claude 3.5 Sonnet operations (~3,000-4,000 tokens per 10-movie batch)
- **Design Choice**: Claude 3.5 Sonnet for superior reasoning capabilities with complete resource consumption visibility

#### 4. Flow Control & Batch Control Node (`shouldContinueSearching` + `batch_control_and_routing_node`)
**Responsibility**: Pagination management, candidate accumulation, final recommendation compilation, and token reporting
- **Candidate Accumulation**: Collects acceptable candidates (≥0.75 confidence) across multiple batches
- **Pagination Logic**: Manages batch offsets and determines when more movies are available for processing
- **Threshold Management**: Continues processing until minimum candidates (5) are found or movies exhausted
- **Final Compilation**: Sorts accumulated candidates by confidence score and selects top 5 recommendations with diversity optimization
- **Comprehensive Output**: Includes movie descriptions, detailed reasoning, and complete metadata in final display
- **Token Reporting**: Provides comprehensive usage summary with total tokens, input/output breakdown, and operation count
- **Adaptive Termination**: Balances quality requirements with available movie inventory and resource consumption
- **Design Choice**: Pagination-based approach with complete transparency into resource usage and recommendation quality

## Key Architectural Decisions

### Comprehensive Token Consumption Tracking
- **Decision**: Global token tracking system with detailed monitoring across all LLM operations
- **Implementation**: TokenTracker utility class integrated with all LLM services (evaluation, enhancement, normalization)
- **Rationale**:
  - Complete visibility into resource consumption for cost analysis and budget planning
  - Performance optimization insights through detailed input/output token breakdowns
  - Operational transparency with total token counts and operation statistics
  - Production-ready resource monitoring for enterprise deployments
  - Cost prediction and optimization capabilities for large-scale usage

**Token Tracking Features**:
- **Real-time Monitoring**: Tracks tokens for each LLM operation as it occurs
- **Detailed Breakdown**: Separates input tokens (prompts) from output tokens (responses)
- **Operation Counting**: Monitors total number of LLM calls across the workflow
- **Service Attribution**: Tracks usage by service (prompt enhancement, movie evaluation, normalization)
- **Final Reporting**: Comprehensive usage summary in final output with formatted statistics

**Typical Token Consumption** (based on test run with 127,889 total tokens):
- Prompt Enhancement: ~500-800 tokens per operation
- Movie Evaluation: ~3,000-4,000 tokens per 10-movie batch
- Movie Normalization: ~400-600 tokens per movie batch
- Total Workflow: ~120,000-130,000 tokens for complete recommendation process

### Enhanced Prompt Processing
- **Decision**: Dedicated Claude 3 Haiku-powered prompt enhancement as first step
- **Rationale**: 
  - Transforms vague user requests into structured search criteria with genre mapping and theme extraction
  - Improves downstream search accuracy and relevance through semantic understanding
  - Handles complex contextual requirements (family-friendly, age-appropriate content)
  - Cost-effective model choice for fast text analysis without sacrificing quality

### Production Web Scraping with Caching
- **Decision**: Real-time Prime Video scraping with SQLite caching layer
- **Rationale**:
  - Live data ensures current movie availability and pricing information
  - Intelligent caching minimizes redundant scraping and improves performance
  - Rate limiting and proper headers maintain ethical scraping practices
  - LLM-powered normalization ensures consistent data quality

### Pagination-Based Candidate Accumulation
- **Decision**: Process movies in paginated batches while accumulating acceptable candidates
- **Rationale**:
  - Prevents overwhelming Claude 3.5 Sonnet with large batch sizes for optimal reasoning quality
  - Enables early termination when sufficient high-quality candidates are found
  - Better resource management and cost control for production LLM usage
  - Maintains comprehensive coverage of available movie inventory

### Intelligent Threshold Management
- **Decision**: Candidate accumulation with configurable quality thresholds
- **Rationale**:
  - Balances recommendation quality with system responsiveness
  - Ensures sufficient variety in final recommendations through continued search
  - Prevents infinite processing loops with clear termination conditions
  - Adapts to movie availability and user criteria specificity

### Production LLM Integration with Token Tracking
- **Decision**: AWS Bedrock with model-specific optimization and comprehensive resource monitoring
- **Rationale**:
  - Enterprise-grade reliability and security for production deployments
  - Model selection optimized for specific tasks (Claude 3 Haiku for speed, Claude 3.5 Sonnet for reasoning)
  - Comprehensive error handling and fallback strategies for service resilience
  - Structured output validation using Zod schemas for data consistency
  - Complete token consumption tracking for cost analysis and performance optimization
  - Resource transparency enabling budget planning and usage optimization

### Technology Stack
- **LangGraph.js v1**: Modern workflow orchestration with Annotation.Root() state management
- **TypeScript**: Type safety and better developer experience  
- **AWS Bedrock**: Production LLM integration via @langchain/aws ChatBedrockConverse
  - **Claude 3 Haiku**: Fast prompt enhancement and content analysis (~500-800 tokens/operation)
  - **Claude 3.5 Sonnet**: Advanced reasoning for movie evaluation (~3,000-4,000 tokens/batch)
- **Token Tracking**: Custom TokenTracker utility for comprehensive resource monitoring
- **Web Scraping**: Live Prime Video scraping using Cheerio HTML parser with simplified text extraction
- **SQLite Database**: Production movie caching with better-sqlite3 achieving 100% cache hit rates
- **Winston**: Structured logging with DEBUG level as default for comprehensive tracing
- **Zod**: Runtime schema validation for LLM outputs and data consistency

## State Management

### Modern LangGraph v1 State Structure with Token Tracking
```typescript
const VideoRecommendationAgentState = Annotation.Root({
  // Input from user
  userInput: Annotation<string>,
  
  // Enhanced criteria from prompt enhancement node
  enhancedUserCriteria: Annotation<UserCriteria | null>,
  
  // Movie discovery and pagination state
  allDiscoveredMovies: Annotation<Movie[]>, // All movies found so far
  discoveredMoviesBatch: Annotation<Movie[]>, // Current batch for evaluation
  movieBatchOffset: Annotation<number>, // Current position in all movies
  movieBatchSize: Annotation<number>, // How many movies to send to evaluation per batch
  processedMovies: Annotation<Movie[]>, // Normalized movies from web scraping
  movieLinksQueue: Annotation<MovieLink[]>, // Queued links for processing
  
  // Evaluation results and candidate accumulation
  evaluatedMoviesBatch: Annotation<MovieEvaluation[]>, // Current batch evaluations
  allAcceptableCandidates: Annotation<MovieEvaluation[]>, // All good candidates so far (≥0.75 confidence)
  qualityGatePassedSuccessfully: Annotation<boolean>,
  highConfidenceMatchCount: Annotation<number>,
  minimumAcceptableCandidates: Annotation<number>, // Minimum candidates needed (default: 5)
  
  // Control flow state
  searchAttemptNumber: Annotation<number>,
  maximumSearchAttempts: Annotation<number>,
  finalRecommendations: Annotation<MovieEvaluation[]>,
  
  // Token consumption tracking
  totalTokensConsumed: Annotation<number>, // Accumulated token usage across all LLM operations
  
  // Discovery and processing state
  discoveryDepth: Annotation<number>, // Current depth for recursive discovery
  maxDiscoveryDepth: Annotation<number>, // Maximum recursion depth
  processedUrls: Annotation<string[]>, // URLs already processed to avoid duplicates
  
  // Error handling
  lastErrorMessage: Annotation<string | undefined>,
});
```

### Conditional Routing Logic with Quality Optimization
- **Primary Path**: Prompt Enhancement → Movie Discovery → Intelligent Evaluation → Flow Control (accumulate candidates)
- **Pagination Path**: Flow Control → (Need more candidates + movies available) → Movie Discovery (next batch with offset)
- **Completion Path**: Flow Control → (Sufficient candidates ≥5 OR movies exhausted) → Batch Control → Final Recommendations with Token Summary
- **Fallback Path**: Flow Control → (Max attempts reached) → Batch Control → Best Available Results → End
- **Quality Threshold**: Minimum 5 acceptable candidates (≥0.75 confidence score) with diversity optimization
- **Token Tracking**: Comprehensive monitoring across all LLM operations with final usage reporting

## Production Implementation Approach

### Real-World Integration Strategy
The current implementation uses production-grade services and APIs:

- **AWS Bedrock Integration**: Live Claude 3 Haiku and 3.5 Sonnet models with proper authentication
- **Prime Video Web Scraping**: Real-time data fetching with Cheerio HTML parsing and anti-detection measures
- **SQLite Database**: Persistent movie caching with better-sqlite3 for production performance
- **Comprehensive Monitoring**: Every operation logged with timing, costs, and success metrics

### Benefits of Production Approach
1. **Real Data Quality**: Current movie availability, ratings, and metadata from live sources
2. **Scalable Architecture**: Caching, pagination, and batch processing for production loads
3. **Enterprise Reliability**: Error handling, fallback strategies, and service resilience
4. **Cost Optimization**: Smart caching and model selection to minimize operational expenses

## Production Benefits

This architecture demonstrates:

1. **Modern LangGraph v1 Patterns**: Latest Annotation.Root() state management with pagination support and comprehensive state tracking
2. **Complex Workflow Orchestration**: Multi-step processes with intelligent candidate accumulation and adaptive quality thresholds
3. **Production LLM Integration**: Real AWS Bedrock integration with Claude 3 Haiku and 3.5 Sonnet plus comprehensive token tracking
4. **Resource Monitoring**: Complete visibility into LLM token consumption with detailed cost analysis and optimization insights
5. **Web Scraping at Scale**: Live data fetching with intelligent caching (100% hit rates), rate limiting, and error recovery
6. **Performance Optimization**: Pagination, caching, and batch processing for production scalability with resource consumption awareness
7. **Data Consistency**: Zod schema validation and SQLite persistence for reliable data handling
8. **Modular Architecture**: Clear separation of concerns with specialized service layers and token tracking integration
9. **Enterprise Logging**: Production-ready Winston logging with structured tracing, debugging, and resource monitoring
10. **Cost Transparency**: Comprehensive token usage reporting enabling budget planning and performance optimization

## Future Enhancements

### Phase 2 Improvements
- **Multi-Platform Scraping**: Extend beyond Prime Video to Netflix, Hulu, Disney+, etc.
- **Parallel Batch Processing**: Concurrent evaluation of multiple movie batches for improved performance
- **Advanced User Modeling**: Machine learning-based preference learning from user feedback and ratings
- **Streaming Availability APIs**: Integration with JustWatch or similar services for comprehensive availability data

### Advanced Features
- **Real-Time Price Monitoring**: Track subscription costs and promotional offers across platforms
- **Social Recommendation Engine**: Incorporate ratings and reviews from trusted critics and friends
- **Content Similarity Engine**: Vector embeddings for advanced content-based filtering and clustering
- **Personalized Quality Metrics**: Adaptive scoring based on individual user viewing history and preferences

## Implementation Notes

### LangGraph v1 Modernization
- **State Definition**: Uses modern `Annotation.Root()` pattern instead of deprecated channels
- **Type Safety**: Improved TypeScript integration with `typeof VideoRecommendationAgentState.State`
- **Constructor**: Modern `new StateGraph(VideoRecommendationAgentState)` syntax
- **Future-Proof**: Compatible with latest LangGraph.js ecosystem updates

### Production Architecture
- **Real HTTP Operations**: Live web scraping with proper rate limiting and error handling
- **Production LLM Calls**: AWS Bedrock integration with cost tracking and response validation
- **Intelligent Caching**: SQLite database with cache hit optimization and performance metrics
- **Error Boundaries**: Comprehensive error recovery and graceful degradation strategies

### Production Logging with Winston
- Node-level execution tracking with timing and performance metrics
- HTTP request/response logging for web scraping operations with success rates
- LLM interaction logging with token usage, costs, and response quality metrics
- Candidate accumulation and quality gate evaluation with detailed decision reasoning
- Cache performance monitoring and database operation tracking
- Context-aware child loggers for different system components and services

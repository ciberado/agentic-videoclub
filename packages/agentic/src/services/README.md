# LLM Services Directory

This directory contains specialized LLM integration services for each agent node.
Each service is tailored to the specific requirements, prompts, and output schemas
needed for its corresponding workflow node.

## Current Services

### `prompt-enhancement-llm.ts`

- **Purpose**: Analyzes natural language user input and transforms it into structured movie search criteria
- **Model**: Claude 3 Haiku (fast, cost-effective for text analysis)
- **Input**: Raw user request string
- **Output**: Structured UserCriteria with enhanced genres, exclusions, themes, and search terms
- **Used by**: `nodes/prompt-enhancement.ts`

### `movie-evaluation-factory.ts` 🏭 **PRODUCTION FACTORY**

- **Purpose**: Strategy Factory for movie evaluation with switchable strategies
- **Pattern**: Factory design pattern for strategy instantiation
- **Strategies**: Single-agent OR Pipeline architecture
- **Configuration**: Set `MOVIE_EVALUATION_STRATEGY=single-agent|pipeline`
- **Default**: `pipeline` (production approach)
- **Features**: A/B testing, performance comparison, fallback mechanisms
- **Input**: Movie batch + enhanced user criteria + optional strategy override
- **Output**: MovieEvaluation objects with confidence scores and reasoning
- **Used by**: `nodes/evaluation.ts`

### `movie-evaluation-pipeline.ts` ⭐ **PRODUCTION STRATEGY**

- **Purpose**: Multi-step pipeline with specialized React Agents (production approach)
- **Model**: Claude 3.5 Sonnet (superior reasoning for complex evaluations)
- **Architecture**: React Agent enrichment → Data processing → Evaluation → Validation
- **Features**: Robust error handling, poster URL extraction, sophisticated fallbacks
- **Pipeline Steps**: Enrichment, Processing, Evaluation, Validation
- **Input**: Movie batch + enhanced user criteria
- **Output**: MovieEvaluation objects with confidence scores and reasoning
- **Used by**: `movie-evaluation-factory.ts` (default strategy)

### `movie-evaluation-single-agent.ts` 🤖 **ALTERNATIVE STRATEGY**

- **Purpose**: Single React agent approach (alternative/comparison)
- **Model**: Claude 3.5 Sonnet with automatic TMDB tool calling
- **Architecture**: Single React agent handles both enrichment and evaluation
- **Status**: Available for A/B testing, not used by default
- **Input**: Movie batch + enhanced user criteria
- **Output**: MovieEvaluation objects with confidence scores and reasoning
- **Used by**: `movie-evaluation-factory.ts` (when `MOVIE_EVALUATION_STRATEGY=single-agent`)

### `movie-normalization-llm.ts`

- **Purpose**: Normalizes and standardizes movie titles and years from scraped data
- **Model**: Claude 3 Haiku (efficient for structured data extraction)
- **Input**: Raw movie title strings from web scraping
- **Output**: Normalized NormalizedMovie objects with clean titles and years
- **Used by**: `services/prime-video-scraper.ts`

## Supporting Services

### `tmdb-enrichment.ts`

- **Purpose**: TMDB API integration with SQLite caching and rate limiting
- **Features**: Movie metadata enrichment, intelligent caching, batch processing
- **Rate Limiting**: Max 10 API calls per evaluation batch
- **Used by**: `tmdb-enrichment-tool.ts`

### `tmdb-enrichment-tool.ts`

- **Purpose**: LangChain tool wrapper for TMDB enrichment service
- **Integration**: Provides TMDB data access to LLM evaluation processes
- **Used by**: `movie-evaluation-llm.ts`

## Design Philosophy

Each LLM service is:

- **Specialized**: Tailored prompts and schemas for specific use cases
- **Focused**: Single responsibility per service
- **Reusable**: Can be used by multiple nodes if needed
- **Testable**: Isolated functionality for easier testing
- **Maintainable**: Clear separation of concerns

This approach avoids the monolithic LLM service anti-pattern and enables
optimized model selection and prompt engineering for each specific task.

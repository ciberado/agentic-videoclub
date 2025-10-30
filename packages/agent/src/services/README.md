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

### `movie-evaluation-llm.ts`

- **Purpose**: Intelligent batch evaluation of movies against user preferences with TMDB enrichment
- **Model**: Claude 3.5 Sonnet (superior reasoning for complex evaluations)
- **Tools**: TMDB Movie Enrichment (rate limited to 10 calls per batch)
- **Input**: Movie batch + enhanced user criteria
- **Output**: MovieEvaluation objects with confidence scores and reasoning
- **Used by**: `nodes/evaluation.ts`

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

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

## Future Services

### `movie-evaluation-llm.ts` (planned)
- **Purpose**: Intelligent batch evaluation of movies against user preferences
- **Model**: Claude 3.5 Sonnet (superior reasoning for complex evaluations)
- **Input**: Movie batch + enhanced user criteria
- **Output**: MovieEvaluation objects with confidence scores and reasoning

### `content-analysis-llm.ts` (planned)  
- **Purpose**: Deep content analysis for movie metadata extraction
- **Model**: Claude 3 Haiku (efficient for structured data extraction)
- **Input**: Movie HTML/text content from scraped pages
- **Output**: Structured movie metadata (themes, content ratings, detailed descriptions)

## Design Philosophy

Each LLM service is:
- **Specialized**: Tailored prompts and schemas for specific use cases
- **Focused**: Single responsibility per service
- **Reusable**: Can be used by multiple nodes if needed
- **Testable**: Isolated functionality for easier testing
- **Maintainable**: Clear separation of concerns

This approach avoids the monolithic LLM service anti-pattern and enables
optimized model selection and prompt engineering for each specific task.
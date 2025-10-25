# Video Recommendation Agent - Design Document

## Overview

This document outlines the architectural decisions for building a video recommendation agent using LangGraph.js and TypeScript. The agent is designed as an educational exercise to demonstrate complex workflow orchestration with both deterministic and LLM-powered nodes.

## System Architecture

### High-Level Flow
The agent follows a simplified 4-node architecture with conditional routing:

1. **Movie Discovery** → 2. **Smart Filtering** → 3. **Content Acquisition** → 4. **Flow Control**

### Node Design Decisions

#### 1. Movie Discovery Node (`movie_discovery`)
**Responsibility**: Data collection and normalization
- Scrapes movie listing websites for candidate movies
- Fetches detailed information for each movie (recursive HTTP calls)
- Normalizes and structures scraped data
- **Design Choice**: Grouped multiple scraping operations into one node for simplicity

#### 2. Smart Filtering Node (`smart_filtering`) 
**Responsibility**: Intelligent content analysis and filtering
- **LLM Analysis**: Uses language models for thematic analysis and mood detection
- **Deterministic Filtering**: Applies user criteria (genre, year, rating, etc.)
- **Quality Gate**: Simple threshold check (>3 candidates = success)
- **Design Choice**: Combined LLM and rule-based filtering for hybrid intelligence

#### 3. Content Acquisition Node (`content_acquisition`)
**Responsibility**: Torrent search and quality selection
- Searches torrent sites for available content
- Evaluates quality, seeds, and availability
- Selects optimal download links
- **Design Choice**: Abstracted the multi-step torrent process into one logical unit

#### 4. Flow Control Node (`flow_control`)
**Responsibility**: Conditional routing and loop management
- Decides whether to proceed to download or expand search
- Routes back to discovery if quality gate fails
- Manages search criteria expansion
- **Design Choice**: Centralized routing logic for cleaner state management

## Key Architectural Decisions

### Simplified Quality Gate
- **Decision**: Use simple threshold (>3 candidates) instead of complex quality metrics
- **Rationale**: Keeps initial implementation manageable while demonstrating the pattern
- **Future**: Can be enhanced with sophisticated scoring algorithms

### Node Grouping Strategy
- **Decision**: 4 "thick" nodes instead of 8-10 "thin" nodes
- **Rationale**: 
  - Easier state management in LangGraph
  - Fewer edge relationships to maintain
  - Better for debugging and error handling
  - Simpler conditional routing

### Hybrid Intelligence Approach
- **Decision**: Mix deterministic logic with LLM-powered analysis
- **Rationale**:
  - LLMs excel at semantic understanding (themes, mood, similarity)
  - Deterministic rules handle concrete criteria (year, rating, genre)
  - Combines reliability with intelligence

### Technology Stack
- **LangGraph.js**: Workflow orchestration and state management
- **TypeScript**: Type safety and better developer experience
- **Native nodejs**: HTTP client for web scraping
- **Cheerio**: HTML parsing for data extraction
- **LangChain AWS**: LLM integration for content analysis, using Bedrock.

## State Management

### Graph State Structure
```typescript
interface AgentState {
  userCriteria: UserCriteria;
  candidateMovies: Movie[];
  filteredMovies: Movie[];
  searchAttempts: number;
  qualityGatePassed: boolean;
  selectedContent: TorrentLink[];
}
```

### Conditional Routing Logic
- **Success Path**: Discovery → Filtering → Acquisition → End
- **Retry Path**: Discovery → Filtering → (Quality Gate Fails) → Flow Control → Discovery
- **Max Iterations**: Prevent infinite loops with attempt counter

## Educational Benefits

This architecture demonstrates:

1. **Complex Workflow Orchestration**: Multi-step processes with conditional logic
2. **Hybrid AI Systems**: Combining rule-based and LLM-powered components
3. **Error Handling**: Graceful degradation and retry mechanisms
4. **State Management**: Persistent state across async operations
5. **Modular Design**: Clear separation of concerns between nodes

## Future Enhancements

### Phase 2 Improvements
- Enhanced quality gate with weighted scoring
- Parallel processing for movie detail fetching
- Machine learning-based user preference learning
- Integration with legal streaming APIs

### Advanced Features
- Real-time availability monitoring
- Social recommendation features
- Content similarity clustering
- Personalized quality metrics

## Implementation Notes

- All HTTP operations include retry logic and rate limiting
- LLM calls are cached to reduce API costs
- Error boundaries prevent single failures from crashing the entire workflow
- Comprehensive logging for debugging and monitoring

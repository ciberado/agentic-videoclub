# Video Recommendation Agent - Design Document (Updated)

## Overview

This document outlines the architectural decisions for building a video recommendation agent using LangGraph.js and TypeScript. The agent processes natural language user requests to discover, fetch, and evaluate movies through an intelligent multi-phase workflow with adaptive search capabilities.

## System Architecture

### High-Level Flow
The agent follows a 4-node architecture with intelligent prompt enhancement and adaptive batch processing:

1. **Prompt Enhancement** → 2. **Movie Discovery & Data Fetching** → 3. **Intelligent Evaluation** → 4. **Batch Control & Routing**

### Architecture Diagram

```mermaid
graph TD
    A["User Input: 49yo sci-fi fan, hates cheesy stories, family movie night"] --> B[Prompt Enhancement Node]
    
    B --> |"Enhanced Criteria: Genres, themes, family-friendly"| C[Movie Discovery & Data Fetching Node]
    
    C --> |"Batch of Movies (10-15 movies)"| D[Intelligent Evaluation Node]
    
    D --> |"Quality Assessment & Confidence Scores"| E[Batch Control & Routing Node]
    
    E --> |"Quality Gate Passed (≥3 high-confidence matches)"| F[Final Recommendations]
    
    E --> |"Quality Gate Failed - Expand search criteria"| G[Adapt Search Strategy]
    G --> |"Modified Parameters: New genres/time periods"| C
    
    E --> |"Max Attempts Reached"| H[Best Available Results]
    
    style B fill:#e1f5fe
    style D fill:#e8f5e8
    style E fill:#fff3e0
    style F fill:#e8f5e8
    style H fill:#ffebee
    
    classDef llmNode fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef deterministic fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef evaluation fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef routing fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class B llmNode
    class C deterministic
    class D evaluation
    class E routing
```

### Node Design Decisions

#### 1. Prompt Enhancement Node (`prompt_enhancement`)
**Responsibility**: Natural language processing and context enrichment
- **LLM Analysis**: Interprets user's natural language description ("49 years old guy that loves science fiction and hates cheesy stories")
- **Context Expansion**: Adds demographic insights, genre mappings, and preference clarifications
- **Search Strategy**: Generates specific search terms, filters, and quality criteria
- **Family Context**: Identifies family-appropriate content requirements when mentioned
- **Design Choice**: Front-loads intelligence to improve downstream search accuracy

**Example Enhancement**:
```
Input: "I'm a 49 years old guy that loves science fiction and hates cheesy stories"
Enhanced Output: {
  genres: ["Science Fiction", "Thriller", "Drama"],
  excludeGenres: ["Romance", "Comedy", "Musical"],
  ageGroup: "Adult",
  familyFriendly: false,
  preferredThemes: ["Hard sci-fi", "Dystopian", "Space exploration"],
  avoidThemes: ["Romantic subplots", "Slapstick humor", "Overly dramatic"]
}
```

#### 2. Movie Discovery & Data Fetching Node (`movie_discovery_fetching`)
**Responsibility**: Recursive data collection and structured extraction
- **Initial Discovery**: Scrapes movie listing websites using enhanced search criteria
- **Recursive Fetching**: For each discovered movie, recursively fetches detailed information via HTTP calls
- **Link Following**: Automatically follows movie detail links to gather comprehensive data
- **Structured Data Generation**: Converts scraped HTML into structured movie objects with metadata
- **Batch Processing**: Processes movies in configurable batches (default: 10-15 movies per batch)
- **Design Choice**: Combines discovery and detailed fetching for efficiency and data completeness

#### 3. Intelligent Evaluation Node (`intelligent_evaluation`)
**Responsibility**: LLM-powered quality assessment and matching
- **Batch Analysis**: Evaluates the current batch of movies against enhanced user criteria
- **Semantic Matching**: Uses LLM to assess thematic alignment, mood, and content appropriateness
- **Quality Scoring**: Generates confidence scores for each movie's match quality
- **Family Appropriateness**: Evaluates content suitability when family viewing is specified
- **Batch Quality Gate**: Determines if current batch meets minimum quality threshold (e.g., ≥3 high-confidence matches)
- **Design Choice**: Pure LLM approach for nuanced understanding of user preferences and content analysis

#### 4. Batch Control & Routing Node (`batch_control_routing`)
**Responsibility**: Adaptive search management and flow control
- **Quality Assessment**: Reviews evaluation results and batch quality metrics
- **Routing Decisions**: 
  - Success → Compile final recommendations
  - Insufficient Quality → Trigger new batch with expanded/modified search criteria
- **Search Strategy Adaptation**: Adjusts search parameters, genres, or time periods for next iteration
- **Loop Management**: Prevents infinite loops with maximum attempt limits
- **Design Choice**: Centralized adaptive logic for intelligent search refinement

## Key Architectural Decisions

### Enhanced Prompt Processing
- **Decision**: Dedicated LLM-powered prompt enhancement as first step
- **Rationale**: 
  - Transforms vague user requests into structured search criteria
  - Improves search accuracy and relevance
  - Handles contextual requirements (family-friendly, age-appropriate)
  - Reduces downstream processing complexity

### Recursive Data Fetching
- **Decision**: Single node handles both discovery and detailed fetching
- **Rationale**:
  - Minimizes state complexity between discovery and detail fetching
  - Enables intelligent link following and data extraction
  - Batch processing for efficient resource utilization
  - Structured data generation for consistent downstream processing

### Batch-Based Quality Evaluation
- **Decision**: Process and evaluate movies in configurable batches
- **Rationale**:
  - Prevents overwhelming the LLM with too many movies at once
  - Enables early termination when sufficient quality matches are found
  - Allows for adaptive search refinement between batches
  - Better resource management and response times

### Adaptive Search Strategy
- **Decision**: Centralized routing node with search strategy adaptation
- **Rationale**:
  - Intelligent retry logic with modified search criteria
  - Prevents infinite loops while maximizing search coverage
  - Learns from previous batch results to improve next iteration
  - Clear separation between evaluation and flow control logic

### Hybrid Intelligence Approach
- **Decision**: Strategic mix of LLM and deterministic processing
- **Rationale**:
  - LLMs excel at semantic understanding and contextual analysis
  - Deterministic logic handles data fetching and structured operations
  - Combines reliability with intelligent content understanding

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

# 🎬 Video Recommendation Multi-Agent System

A production-ready **Multi-Agent System (MAS)** that provides intelligent movie recommendations by combining specialized AI agents with real-time web scraping and smart caching.

## ✨ What It Does

Give the system a natural language description like _"I'm a 49-year-old guy who loves science fiction and hates cheesy stories"_, and it will:

- 🧠 **Understand your preferences** using AI-powered prompt enhancement
- 🔍 **Search Prime Video** with real-time web scraping
- 🤖 **Evaluate movies intelligently** using a React Agent with autonomous TMDB enrichment
- 📊 **Provide quality recommendations** with confidence scores and detailed reasoning
- 💰 **Track resource usage** with comprehensive token monitoring

## 🏗️ Multi-Agent Architecture

The system features **4 specialized agents** working together:

1. **Prompt Enhancement Agent** - Transforms natural language into structured search criteria
2. **Movie Discovery Pipeline** - Scrapes Prime Video with intelligent caching
3. **React Agent Evaluator** - Autonomously enriches and evaluates movies using TMDB data
4. **Flow Control Orchestrator** - Coordinates the entire workflow and manages quality gates

### Key Features

- 🎯 **React Agent Integration** - Autonomous tool usage for movie enrichment
- ⚡ **Smart Caching** - SQLite database with 100% cache hit rates
- 🔄 **Batch Processing** - Pagination with configurable batch sizes
- 📈 **Token Tracking** - Complete visibility into LLM resource consumption
- 🛡️ **Production Ready** - AWS Bedrock integration with comprehensive error handling

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run the recommendation system
npm start

# Run tests
npm test

# View test coverage
npm run test:coverage
```

## 🧪 Example Output

The system provides structured recommendations with:

- **Confidence scores** (0.0-1.0 scale)
- **Detailed reasoning** for each recommendation
- **Complete metadata** including genres, ratings, and descriptions
- **Token usage statistics** for cost analysis

## 📋 Requirements

- Node.js 18+
- AWS credentials for Bedrock access
- Internet connection for Prime Video scraping and TMDB enrichment

## 📚 Learn More

For detailed architectural decisions, agent design patterns, and implementation details, see the comprehensive [DESIGN.md](./DESIGN.md) document.

## 🔧 Technology Stack

- **LangGraph.js** - Multi-agent orchestration
- **TypeScript** - Type safety and developer experience
- **AWS Bedrock** - Production LLM integration (Claude 3 Haiku & 3.5 Sonnet)
- **LangChain** - React Agent implementation
- **Cheerio** - HTML parsing for web scraping
- **SQLite** - Intelligent caching layer
- **Jest** - Testing framework

---

_Built with ❤️ as a demonstration of production-ready multi-agent system architecture._

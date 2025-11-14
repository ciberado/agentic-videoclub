# 🎬 VideoClub: AI-Powered Movie Recommendation System

> An intelligent movie recommendation system that combines **Multi-Agent AI**, **LangGraph workflows**, and **real-time web scraping** to solve the endless scroll problem on streaming platforms.

**Presented at Zaragoza's Community Day** - A demonstration project showcasing production-ready AI agent architecture with AWS Bedrock and JavaScript/TypeScript.

## Links of interests

- [The main repo](https://github.com/ciberado/agentic-videoclub)
- [The presentation](slides.pdf)
- [LangChain website](https://www.langchain.com/)
- [Bedrock Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)
- [Enshittification and the Rot Economy: A Deep Dives Conversation with Cory Doctorow and Ed Zitron](https://www.youtube.com/watch?v=Tz71pIWbFyc)
- [Postgrado de Arquitectura de Public Cloud (UPC School)](https://www.talent.upc.edu/esp/estudis/formacio/curs/319400/postgrau-cloud-computing-architecture/)
- [Javi en Linkedin](https://www.linkedin.com/in/javier-more/)

## Rules After Midnight (Production Guidelines)

From the presentation lessons learned:

- **Set maximum execution time limits** - Agents can get stuck in loops
- **Provide excellent explainability** - Users need to understand recommendations
- **Be generous with logs** - Debugging multi-agent systems is complex
- **Simpler is better** - Complexity increases failure points
- **No AI is better** - Sometimes rule-based solutions work fine

## Ethical Considerations

- **Transparency**: All source code is available for review
- **Human Oversight**: Users can review and reject recommendations
- **No Lock-in**: Uses open standards and self-hosted solutions where possible
- **Privacy**: No user data is stored permanently

## 🎯 The Problem

We've all been there: you have free time, open Prime Video, and spend an hour scrolling through endless options without finding anything good to watch. You end up frustrated, tired, and going to bed without watching anything.

## 💡 The Solution

VideoClub uses AI agents to understand your preferences in natural language and provides intelligent movie recommendations with detailed reasoning. Just tell it what you want to watch like:

> _"I'm a 49-year-old guy who loves science fiction and hates cheesy stories"_

The system will:

- 🧠 **Understand your preferences** using AI-powered prompt enhancement
- 🔍 **Scrape Prime Video** in real-time for available movies
- 🤖 **Evaluate movies intelligently** using autonomous AI agents with TMDB enrichment
- 📊 **Provide quality recommendations** with confidence scores and detailed reasoning

## 🏗️ Architecture Overview

This is a **monorepo** with multiple specialized packages working together:

```
📦 VideoClub Monorepo
├── 🤖 packages/agentic/     # Core AI agent system (LangGraph + AWS Bedrock)
├── 🌐 packages/webapp/     # React web interface with real-time updates
├── 📊 slides/              # Presentation materials (Zaragoza Community Day)
└── 📋 package-template/    # Template for new packages
```

### Multi-Agent System (MAS)

The core `agentic` package implements **3 specialized AI agents** (well, kind of) and a control block:

1. **Prompt Enhancement Agent** - Transforms natural language into structured search criteria, with a sophisticated prompt
2. **Movie Discovery Pipeline** - Scrapes Prime Video with intelligent caching, using the LLM for understanding the page structure
3. **React Agent Evaluator** - Autonomously enriches and evaluates movies using TMDB data. This is the real agent
4. **Flow Control Orchestrator** - Coordinates workflows and manages quality gates

### Technology Stack

- **🧠 AI/ML**: AWS Bedrock (Claude 4), LangChain React Agents
- **🔄 Orchestration**: LangGraph.js for multi-agent workflows
- **🌐 Frontend**: React 18 + TypeScript + Mantine UI + WebSocket
- **⚙️ Backend**: Node.js + Express + real-time log monitoring
- **📊 Data**: Web scraping with Cheerio, TMDB API integration, SQLite caching
- **🔧 DevTools**: TypeScript, Jest, ESLint, Prettier, Husky, Commitlint

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- AWS credentials configured for Bedrock access
- TMDB API key (for movie enrichment)

### Installation & Setup

```bash
# Clone and install dependencies
git clone https://github.com/ciberado/agentic-videoclub
cd videoclub
npm install

# Set up environment variables
cd packages/agentic
cp .env.example .env
# Edit .env with your AWS and TMDB credentials

# Build the project
npm run build
```

### Running the System

```bash
# Option 1: Run the full web interface (recommended)
cd packages/webapp
npm run dev
# Open http://localhost:3000

# Option 2: Run the CLI version
cd packages/agentic
npm start
```

### Development Workflow

```bash
# Run all tests across packages
npm test

# Run with coverage
npm run test:coverage

# Lint and format code
npm run lint
npm run format

# Git hooks and conventional commits are automatically configured
```

## 🎮 Usage Examples

### Web Interface

1. Open the webapp at `http://localhost:3000`
2. Enter your movie preferences in natural language
3. Watch the real-time workflow progress with live updates
4. Review personalized recommendations with confidence scores

### CLI Interface

1. Run `npm start` in the agentic package
2. Follow the interactive prompts
3. Get detailed JSON output with reasoning

### Example Inputs

- _"Family-friendly sci-fi movies for a 12-year-old"_
- _"Serious action movies without romantic subplots"_
- _"Classic comedies from the 80s and 90s"_
- _"Foreign films with subtitles, preferably European"_

## 🧪 Key Features

### 🎯 Intelligent Understanding

- **Natural Language Processing**: Understands complex preference descriptions
- **Context Inference**: Infers age-appropriate content and themes
- **Genre Expansion**: Maps user terms to comprehensive genre categories

### 🔄 Autonomous Operation

- **React Agents**: Self-directed tool usage for movie enrichment
- **Smart Caching**: SQLite database with 100% cache hit rates for performance
- **Error Recovery**: Robust handling of API failures and rate limits

### 📊 Production Ready

- **Token Tracking**: Complete visibility into LLM resource consumption
- **Comprehensive Logging**: Structured logs with execution tracing
- **Real-time Monitoring**: Live workflow progress in web interface
- **Testing**: >95% test coverage with Jest

## 📖 Documentation

- **[Agentic Package](./packages/agentic/README.md)** - Core AI system documentation
- **[WebApp Package](./packages/webapp/README.md)** - Web interface documentation
- **[Design Document](./packages/agentic/DESIGN.md)** - Detailed architecture decisions
- **[Presentation Slides](./slides/README.md)** - Zaragoza Community Day talk

## 🎓 Learning Outcomes

This project demonstrates:

- **Multi-Agent AI Systems** with LangGraph.js orchestration
- **Production AWS Bedrock** integration with Claude models
- **React Agent Patterns** for autonomous tool usage
- **Real-time Web Applications** with WebSocket communication
- **Monorepo Management** with npm workspaces
- **TypeScript Development** with comprehensive tooling
- **Test-Driven Development** with Jest and high coverage

## 🔧 Development

### Project Structure

```
videoclub/
├── packages/
│   ├── agentic/           # Multi-agent AI system
│   │   ├── src/nodes/     # Individual agent implementations
│   │   ├── src/data/      # Data access and caching
│   │   ├── src/config/    # Configuration management
│   │   └── logs/          # Execution logs
│   └── webapp/            # Web interface
│       ├── src/client/    # React frontend
│       ├── src/server/    # Express backend
│       └── src/shared/    # Shared types
├── slides/                # Presentation materials
└── package-template/      # New package template
```

### Contributing

1. Follow conventional commit messages (enforced by Husky)
2. Ensure all tests pass before committing
3. Code is automatically formatted with Prettier
4. TypeScript strict mode is enforced

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ for the Zaragoza Community Day** - Demonstrating how AI agents, JavaScript, and AWS can solve real-world problems while maintaining transparency and user control.

🔗 **Project Repository**: [tinyurl.com/ghavid](https://tinyurl.com/ghavid)

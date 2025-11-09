# Modelos, agentes, MCPs y Javascript ¿Qué puede salir mal?

### Javi Moreno

### Dance course

### What an Agent is?

- Lo que digan hoy mis huevos morenos
- Un programa autónomo que resuelve una tarea planificando y tomando decisiones inteligentes

### Why Javascript?

- Por ser un lenguaje universal

### Let's tackle my headache

- No tengo mucho tiempo libre
- Pero de vez en cuando quiero ver una peli
- Abro Prime Video...
- ...y paso la siguiente hora haciendo scroll infinito buscando algo interesante
- Vamos a solucionarlo

[](#the-workflow,.partial)

### The workflow

```javascript
// Workflow for movie recommendation
async function movieWorkflow() {
    const «userPreferences» = await askUserWhatToWatch();
    const «completedCriteria» = await refineCriteriaNode(userPreferences);

    const «movies» = await movieDiscoveryAgent();
    let «candidates» = [];
    let «currentBatch» = 0;

    do {
        const selectedBatch = await selectNextMovieBatch(movies, currentBatch);
        const enriched = await enrichMovieInfoAgent(selectedBatch);
        const evaluated = await evaluateMoviesAgent(enriched, completedCriteria);
        candidates.push(...evaluated);
        currentBatch++;
    } while (candidates.length < MINIMUM_CANDIDATES);

    return await presentRecommendations(candidates);
}
```

-

### The State

> The State is the memory that will carry on all the data during the workflow
> execution.

## refineCriteriaNode

### The Prompt

```js
You are an expert movie recommendation analyst.
Analyze the user request and extract structured preferences for finding movies.

User Request: "${userInput}"

Please analyze this request and provide structured movie preferences. Consider:

1. **Genre Analysis**: What primary genres does the user want?
What related/similar genres might they enjoy?
   - Example: "sci-fi" → include "Science Fiction", "Futuristic", etc.
   - Example: "action" → include "Action", "Adventure", etc.
   ...
2. **Exclusions**: What genres or styles should be avoided
based on their preferences?
   - If they hate "cheesy stories" → exclude "Romance Comedy", "Melodrama"
   - If they want "serious" movies → exclude "Slapstick Comedy", "Parody"
   ...

Be intelligent about context and inference. For example, a
49-year-old wanting family movies suggests PG/PG-13 content,
not adult-only films. On the other hand, a request for "serious sci-fi"
from a 22-year-old implies more mature themes.

---

Format your response as JSON with these exact fields:
{
  "originalInput": "exact user input",
  "enhancedGenres": ["primary genres and intelligent expansions"],
  "excludeGenres": ["genres to avoid based on preferences"],
  "ageGroup": "Child|Teen|Adult|Senior",
  "familyFriendly": true/false,
  "preferredThemes": ["themes user would enjoy"],
  "avoidThemes": ["themes to avoid"],
  "searchTerms": ["optimized search keywords"]
}

RESPOND ONLY WITH VALID JSON - NO OTHER TEXT OR EXPLANATIONS.
```

::: Notes

- Be kind with the _Please_ statement before our new overlords come.
- You are programing in plain human language!
- We take unestructured data and make it regular `json`

:::

### Talking to Bedrock

```javascript
const llm = new ChatBedrockConverse({
    model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    region: region,
    temperature: 0.1, // Low temperature for consistent, structured outputs
});

const prompt = ...
const response = await client.invoke(
    [
        { role: 'user', content: prompt }
    ]
);

return response;
```

## movieDiscoveryAgent

### First approach: Ask the LLM to do the hard job

::: Notes

750.000 characters per pure html page

:::

### Second attempt: Extract the useful information

```js
import { convert } from 'html-to-text';

function extractRelevantMovieContent(html: string): string {
  const cleanedText = convert(html, {
    selectors: [
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'noscript', format: 'skip' }
    ],
  });
  // Limit size to prevent token overuse
  return cleanedText.substring(0, 25000);
}
```

## enrichMovieInfoAgent

### Let's get additional data

### Providing hands to our agent

### LLM can invoke functions, isn't it?

### NO

### How a tool works

- Your Model is trained to understand when it needs external help
- You provide in the prompt instructions with the available functions
- If it happens, it returns structured data with the invocation syntax
- Your agent application does the actual invocation
- And then it calls again the LLM adding the results to the conversation

::: Notes

All SDK provide support for this pattern.

:::

### Making some hands for our agent

```js
function tmdbEnrichmentToolFn() {
    this.tmdb = new TMDB(accessToken);
    const searchResults = await this.tmdb.search.movies({
    query: movie.title,
    year: movie.year,
    });
    ...
}
```

### Explaining what can it do with its hands

```js
const tmdbEnrichmentToolOptions = {
  name: 'tmdb_movie_enrichment',
  description: `Get additional movie information from The Movie Database (TMDB) 
                when existing data is insufficient for evaluation.
  `,
  schema: z.object({
    title: z.string().describe('The movie title to search for'),
    year: z
      .number()
      .optional()
      .describe('The release year of the movie (optional, helps with accuracy)'),
  }),
};
```

### Attaching the hands to the agent

```js
const llm = new ChatBedrockConverse({
  model: modelId,
  region: region,
  temperature: 0.1,
});

const tmdbEnrichmentTool = tool(tmdbEnrichmentToolFn, tmdbEnrichmentToolOptions);

const llmWithTools = llm.bindTools([tmdbEnrichmentTool]);
```

### MCPs

::: Notes

It is just a protocol for side-running the tools in another process.

:::

## evaluateMoviesAgent

[](.coverbg)

![Welcome to the Zaragoza's Community Day](images/welcome.png)

[](#javi,.coverbg)

### Javi Moreno

![](images/jeff-smiling.jpg)

[](#ntt-data,.no-header)

### NTT DATA

![NTT DATA logo](images/ntt/ntt/logo-white/GlobalLogo_NTTDATA_White_RGB.png)

::: Notes

Comenta que somos sponsor y que es bien.

:::

[](#upc,.no-header)

![UPC Logo](images/upc.png)

::: Notes

Comenta que también somos sponsors y que es súper bien.  
Que miren la bolsa y los cursos.  
Y que no sé a quién voy a pasar los tickets de gastos.

[](#free-time,.coverbg)

### Free time!

![High-Angle Shot of a Man Lying on Snow-Covered Ground, by Orientation, https://www.pexels.com/photo/high-angle-shot-of-a-man-lying-on-snow-covered-ground-6667140/](https://images.pexels.com/photos/6667140/pexels-photo-6667140.jpeg)

::: Notes

No tengo mucho tiempo libre, y cuando lo tengo pienso ¡descansa!  
Y me quiero poner una peli en Prime, y entonces

:::

[](#prime,.coverbg)

![Prime Video](images/prime.png)

::: Notes

Una hora después sigo en el scrolling infernal sin solución de continuidad.  
Enfadado y con sueño. A dormir.

:::

[](#title,.coverbg)

# Modelos, agentes, MCPs y Javascript ¿Qué puede salir mal?

![El Alma del Ebro Sculpture in Zaragoza, Spain , by Pau Sabaté, https://www.pexels.com/photo/el-alma-del-ebro-sculpture-in-zaragoza-spain-13562058/](https://images.pexels.com/photos/13562058/pexels-photo-13562058.jpeg?cs=tinysrgb&w=1920&h=10800&dpr=1)

::: Notes

Cuenta cómo dijiste "con lo bien que te lo pasaste el año pasado, qué tontería podrías presentar este?"  
Llevas trabajando meses creando agentes en el trabajo.
Ya sería hora de hacer algo útil con lo que has aprendido.  
Y quizá de ahorrar algún momento de confusión.

:::

[](.coverbg)

### Demo!

![A car through a firewall](images/car-explosion.jpg)

[](#dance-intro,.coverbg.header-left)

### Dance course

![Simple dance steps](images/dance-1.jpg)

[](#agent-definition,.coverbg.no-header.grayedbg)

### Definition of "Agent"

![A Man Holding a Newspaper , by Pavel Danilyuk, https://www.pexels.com/photo/a-man-holding-a-newspaper-7519018/](https://images.pexels.com/photos/7519018/pexels-photo-7519018.jpeg)

> Whatever my brown balls say

Jim Smith, Marketing director

::: Notes

- Lo que digan hoy mis huevos morenos
- Un programa autónomo que resuelve una tarea planificando y tomando decisiones inteligentes

:::

[](#real-definition,.coverbg.flipped.no-header)

### Definition of "Agent", take 2

![Woman in Discussing A Lesson Plan, by Orientation, https://www.pexels.com/photo/woman-in-discussing-a-lesson-plan-3772511/](https://images.pexels.com/photos/3772511/pexels-photo-3772511.jpeg)

- **Autonomous application** that uses generative AI to complete tasks
- **Takes actions** on its own - not just answering questions, but using tools, making decisions, running workflows
- **Has goals** - works toward objectives with minimal human supervision
- **Uses reasoning** - breaks down complex tasks into steps and adapts based on results

::: Notes

El punto importante es el primero: una aplicación que usa LLMs, no un LLM.

:::

[](#bedrock,.illustration.contain.header-right)

### Amazon Bedrock

![Amazon Bedrock Logo](images/bedrock.png)

Amazon Bedrock is a fully managed service offering **serverless** access to foundation models from **Anthropic**, Meta, and Amazon, etc. with no infrastructure management, pay-per-use pricing, and **enterprise-grade** security.

::: Notes

Comenta que ahora mismo los modelos están subvencionados por esas hermanitas de la caridad que son los VC y que al igual que Uber por un motivo u otro los precios subirán en los próximos años. Aprovechemos mientras podamos!

Precios Sonnet: $3 por millón input, $15 por millón output
Precios Haiku: $1 por millon input,$5 por millón output

:::

[](#torvalds,.coverbg.header-down)

### Show me the code

![Linus Torvalds](images/linus.png)

[](.illustration.header-right)

### LangChain

![](images/langgraph.png)

A toolkit that helps you build apps with LLMs without losing your sanity. It handles the boring stuff like connecting to different AI models, managing conversation memory, and hooking up external tools.

::: Notes

Justifica como a medio plazo los LLMs pueden ser una commodity, pero las forma de
integrarnos con ellos se pueden convertir en un vendor-lock.

Comenta que Langchain tiene una comunidad importante, una documentación lamentable y
montañas de dinero en VC. El futuro no es alagüeño, pero podría ser peor: podríamos
utilizar directamente el API de Bedrock.

:::

[](#the-workflow,.partial)

### The workflow

```javascript
// Workflow for movie recommendation
async function movieWorkflow() {
    const «userPreferences» = await askUserWhatToWatch();
    const «refinedCriteria» = await refineCriteriaNode(userPreferences);

    const «movies» = await movieDiscoveryNode();
    let «candidates» = [];
    let «currentBatch» = 0;

    do {
        const evaluated =
            await evaluateMoviesNode(movies, currentBatch, refinedCriteria);
        candidates.push(...evaluated);
        currentBatch++;
    } while (shouldIContinueNode(candidates));

    return await presentRecommendations(candidates);
}
```

-

[](#the-state,.illustration.header-right)

### The State

![Person Writing on Pink Sticky Notes, by Orientation, https://www.pexels.com/photo/person-writing-on-pink-sticky-notes-3854816/](https://images.pexels.com/photos/3854816/pexels-photo-3854816.jpeg)

It is the **shared memory** or data structure that persists throughout a workflow execution, containing all the information that agents need to access, modify, and pass between each other.

::: Notes

The State is the memory that will carry on all the data during the workflow execution.

:::

[](#refinecriterianode,.no-header.highlight-snippets)

### refineCriteriaNode

```javascript
// Workflow for movie recommendation
async function movieWorkflow() {
    const userPreferences = await askUserWhatToWatch();
    «const refinedCriteria = await refineCriteriaNode(userPreferences);»
    const movies = await movieDiscoveryNode();
    let candidates = [];
    let currentBatch = 0;

    do {
        const evaluated =
            await evaluateMoviesNode(movies, currentBatch, refinedCriteria);
        candidates.push(...evaluated);
        currentBatch++;
    } while (shouldIContinueNode(candidates));

    return await presentRecommendations(candidates);
}
```

[](.highlight-snippets)

### Talking to Bedrock

```javascript
const llm = new ChatBedrockConverse({
    model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    region: region,
    temperature: 0.1, // Low temperature for consistent, structured outputs
});

const «prompt» = ...
const response = await client.invoke(
    [
        { role: 'user', content: «prompt» }
    ]
);

return response;
```

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

[](#moviediscoverynode,.no-header.highlight-snippets)

### movieDiscoveryNode

```javascript
// Workflow for movie recommendation
async function movieWorkflow() {
    const userPreferences = await askUserWhatToWatch();
    const refinedCriteria = await refineCriteriaNode(userPreferences);
    «const movies = await movieDiscoveryNode();»
    let candidates = [];
    let currentBatch = 0;

    do {
        const evaluated =
            await evaluateMoviesNode(movies, currentBatch, refinedCriteria);
        candidates.push(...evaluated);
        currentBatch++;
    } while (shouldIContinueNode(candidates));

    return await presentRecommendations(candidates);
}
```

[](#wish,.coverbg.no-header)

### First approach

![White Dandelion Flower Shallow Focus Photography, by Orientation, https://www.pexels.com/photo/white-dandelion-flower-shallow-focus-photography-54300/](https://images.pexels.com/photos/54300/pexels-photo-54300.jpeg)

> "This is a Prime Video page, extract the movie data."

::: Notes

Descargaba el html y se lo mandaba al Claude en el prompt.
El caso es que no funcionaba muy bien.

:::

[](.coverbg.header-left)

### 750KB of HTML

![Animal On Green Grass Field, by Filip Olsok, https://www.pexels.com/photo/animal-on-green-grass-field-4003495/](https://images.pexels.com/photos/4003495/pexels-photo-4003495.jpeg)

::: Notes

- 750.000 characters per pure html page.
- Con assets se va a 18MB.
- Para esto se utiliza Retrieval Augmented Generation (RAG)

:::

[](.coverbg.header-right.header-down)

### Retrieval Augmented Generation

![White Papers, by Amanda George, https://www.pexels.com/photo/white-papers-2978800/](https://images.pexels.com/photos/2978800/pexels-photo-2978800.jpeg)

::: Notes

- Consultas una base de datos, extraes chunks relevantes, los insertas en el prompt.
- Pides al LLM que cuando utilice un chunk lo marque como una citación.
- Langchain lo soporta nativamente.

- AWS soporta **Knowledge Bases** como servicio de integración y storage basado en vectores.
- También puede implementarse con otras bases de datos.

- Pero yo ya tengo un trabajo, esto es por las risas.

:::

[](.no-header.highlight-snippets)

### Second attempt: Extract the useful information

```js
import { convert } from 'html-to-text';

function extractRelevantMovieContent(html: string): string {
  const cleanedText = «convert»(html, {
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

::: Notes

Maximize the amount of useful information in the prompt.

:::

[](.covervg)

![A couple dancing](images/dance-2.jpg)

[](#moviediscoverynode,.no-header.highlight-snippets)

### evaluateMoviesNode

```javascript
// Workflow for movie recommendation
async function movieWorkflow() {
    const userPreferences = await askUserWhatToWatch();
    const refinedCriteria = await refineCriteriaNode(userPreferences);
    const movies = await movieDiscoveryNode();
    let candidates = [];
    let currentBatch = 0;

    do {
        «const evaluated =
            await evaluateMoviesNode(movies, currentBatch, refinedCriteria);»
        candidates.push(...evaluated);
        currentBatch++;
    } while (shouldIContinueNode(candidates));

    return await presentRecommendations(candidates);
}
```

::: Notes

- Nuestro objetivo es conseguir un score para cada película.
- Tenemos información básica sobre la misma, con un poco de suerte.
- Pero seguramente algunas películas carecerán de datos suficientes.
- Y Prime Video no ofrece reviews de clientes.

:::

[](.coverbg.no-header)

### We may need additional data

![](images/tmdb.png)

::: Notes

- More than 1M movie references

:::

[](#llm-fierce,.coverbg)

### LLM can invoke tools, isn't it?

![Fierce robot](images/robot-fierce.png)

[](#llm-sad,.coverbg)

### NO

![Sad robot](images/robot-sad.png)

[](#robot-tool,.coverbg.header-down.header-right)

### It's not the spoon that bends, it is only your agent

![A White Robot with Foot Above a Small Robot, by Orientation, https://www.pexels.com/photo/a-white-robot-with-foot-above-a-small-robot-8294618/](https://images.pexels.com/photos/8294618/pexels-photo-8294618.jpeg)

::: Notes

- Your Model is trained to understand when it needs external help
- You provide in the prompt instructions with the available functions
- If it happens, it returns structured data with the invocation syntax
- Your agent application does the actual invocation
- And then it calls again the LLM adding the results to the conversation

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
  description: `Get additional movie information from The Movie 
    Database (TMDB) when existing data is insufficient for evaluation.`,
  schema: z.object({
    title: z.string().describe('The movie title to search for'),
    year: z
      .number()
      .optional()
      .describe('The release year of the movie (optional, helps with accuracy)'),
  }),
};
```

[](.highlight-snippets)

### Attaching the hands to the agent

```js
const tmdbEnrichmentTool = tool(tmdbEnrichmentToolFn, tmdbEnrichmentToolOptions);
const agent = «createAgent»({
  model: new ChatBedrockConverse({
    model: modelId,
    region: process.env.AWS_REGION || 'us-east-1',
    temperature: 0.2,
  }),
  tools: [tmdbEnrichmentTool],
});
const input = `... ...
    Use the TMDB enrichment tool if you need additional information,
    then «provide your score evaluation» as JSON. ... ...
`;
const response = await agent.invoke({
  messages: [{ role: 'user', content: input }],
});
```

::: Notes

- The prompt is, of course, much more complicated.

:::

[](.coverbg.header-down)

### Model context protocol

![](images/bubble-2.png)

::: Notes

The Model Context Protocol (MCP) is a standardized way for AI models to interact with external tools and data sources through a separate process or service. Instead of having tools directly embedded within your agent application, MCP allows you to run tools as independent services that communicate with your AI model through a well-defined protocol.

:::

## evaluateMoviesAgent

# @subql/query

## Run this package

To quickly setup the project, add a `.env` file in the `subql/packages/query` folder with the following content:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_DATABASE=postgres
```

then run the following command

```sh
NODE_OPTIONS="-r dotenv/config" yarn start:dev -- --name <subquery_name> --playground
```

## LLM Configuration

Suggest to use reasoning models to archive better quality of results.

### Choose one of the following providers:

### Option 1: OpenAI

LLM_PROVIDER=openai
LLM_MODEL=o1 # Optional: defaults to '4o-mini'
OPENAI_API_KEY=your_openai_api_key

### Option 2: Anthropic Claude

LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-7-sonnet-latest # Optional: defaults to 'claude-3-7-sonnet-latest'
ANTHROPIC_API_KEY=your_anthropic_api_key

### Option 3: Custom OpenAI-compatible endpoint

LLM_PROVIDER=openai
LLM_BASE_URL=http://your-llm-endpoint/v1 # Required for custom provider
LLM_MODEL=your-model-name # Required: model name for custom endpoint
OPENAI_API_KEY=your_api_key # Optional: API key for custom endpoint

### Common LLM Settings

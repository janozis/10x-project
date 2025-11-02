# OpenRouter Service - Environment Variables

The OpenRouter service requires the following environment variables to be configured:

## Required Variables

### OPENROUTER_API_KEY
- **Description**: Your OpenRouter API key
- **Required**: Yes
- **Example**: `sk-or-v1-...`
- **How to get**: Visit https://openrouter.ai/keys to generate your API key

## Optional Variables

### OPENROUTER_REFERER
- **Description**: HTTP-Referer header sent with requests (your domain)
- **Required**: No
- **Example**: `https://your-domain.example`
- **Purpose**: OpenRouter uses this for analytics and optional rate limits per domain

### OPENROUTER_TITLE
- **Description**: X-Title header sent with requests (your application name)
- **Required**: No
- **Example**: `10x-project`
- **Purpose**: Helps identify your application in OpenRouter's dashboard

## Configuration

Add these variables to your `.env` file (server-side only):

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_REFERER=https://your-domain.example
OPENROUTER_TITLE=10x-project
```

**Important Security Notes:**
- These variables must be kept server-side only
- Never expose the API key to the browser/client
- Use Astro API routes to proxy requests to OpenRouter
- The `.env` file should be in `.gitignore` (never commit it)
- Astro automatically loads `.env` variables as `import.meta.env.*` in server-side code

## Usage in Code

The service automatically reads these variables using `import.meta.env`:

```typescript
import { OpenRouterService } from './lib/services/openrouter';

// Reads from import.meta.env.OPENROUTER_API_KEY by default
const service = new OpenRouterService({
  headers: {
    referer: import.meta.env.OPENROUTER_REFERER,
    title: import.meta.env.OPENROUTER_TITLE
  }
});
```

Or override them explicitly:

```typescript
const service = new OpenRouterService({
  apiKey: 'sk-or-...',
  headers: {
    referer: 'https://my-domain.com',
    title: 'My App'
  }
});
```


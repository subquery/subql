# Query Service Structure Exploration

## Directory Structure

```
packages/query/src/
├── configure/
│   ├── configure.module.ts
│   ├── config.ts
│   └── x-postgraphile/
│       └── debugClient.ts
├── utils/
│   └── logger.ts
├── yargs.ts
├── main.ts
└── ...
```

## Key Files to Explore

### 1. Health Check Related
- Look for health check endpoints in the configure module or middleware
- Check if there's a dedicated health module or controller

### 2. Metadata Related
- Check configure/config.ts for metadata configuration
- Look for environment variables and configuration options

## Next Steps

1. Review configure.module.ts for health check setup
2. Check config.ts for metadata-related configuration
3. Look for any health or metadata modules in subdirectories

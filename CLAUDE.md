# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Plan and Reivew

### Before Starting work
- Always in planning mode, to make a plan
- After the plan is made, make sure to write the plan to ./.claude/tasks/TASK_NAME.md
- The plan should be a detailed implementation and the reasoning behind them as well as the tasks broken down
- If the task requires external knowledge or certain dependencies, also research to get the latest knowledge. (Use the Task tool for research)
- Don't over plan it, always design an MVP
- Once you make the plan, firstly ask me to review it . Do not continue until I approve the plan

### While implementing
- The plan should be updated as you work
- After completing tasks in the plan you should append a detailed description of the channges you made, so the following tasks can be handed over to other engineers

## Development Commands

### Building
- `yarn build` - Build all packages in the workspace using TypeScript
- Individual package builds use `tsc -b` and copy necessary files (e.g., CLI templates)

### Testing
- `yarn test` - Run Jest tests with coverage in UTC timezone
- `yarn test:ci` - Run tests in CI mode with specific patterns
- `yarn test:docker` - Run tests in Docker containers

### Linting and Code Quality
- `yarn lint` - Run ESLint across all TypeScript files in packages
- Uses ESLint with TypeScript support, Prettier, and various plugins
- Configured with husky pre-commit hooks and lint-staged

### CLI-Specific Commands (packages/cli)
- `yarn build` - Builds CLI and copies templates to lib/
- `yarn format` - Format code using Prettier
- `yarn codegen` - Generate GraphQL and API client code
- `yarn codegen:graphql` - Generate GraphQL types
- `yarn codegen:chs` - Generate consumer host service API client

## Project Architecture

### Monorepo Structure
This is a Yarn workspace monorepo containing multiple packages:

- **`@subql/cli`** - Command-line interface for SubQuery projects (OCLIF-based)
- **`@subql/node`** - Substrate-specific SubQuery indexer implementation
- **`@subql/node-core`** - Core chain-agnostic indexing functionality
- **`@subql/query`** - GraphQL query service
- **`@subql/common`** - Shared utilities and types
- **`@subql/common-substrate`** - Substrate-specific common utilities
- **`@subql/types-core`** - Core type definitions
- **`@subql/utils`** - General utility functions

### CLI Commands Architecture
The CLI uses OCLIF framework with commands organized by functionality:

- **Core project lifecycle**: `init`, `build`, `publish`
- **Code generation**: `codegen` (GraphQL types, ABI imports)
- **Multi-chain support**: `multi-chain add`
- **Network operations**: Commands for SubQuery Network (deployments, projects, API keys, boosts)
- **OnFinality hosting**: Project and deployment management
- **Migration tools**: Project upgrade utilities
- **MCP integration**: Model Context Protocol support for AI tools

### Key Technologies
- **TypeScript** throughout with strict configuration
- **OCLIF** for CLI framework
- **Jest** for testing with custom module mapping for workspace packages
- **ESBuild** and **Webpack** for bundling
- **GraphQL** code generation
- **Zod** for schema validation
- **Ethers.js** for Ethereum integration
- **WalletConnect** for wallet interactions

### Development Patterns

#### Package Dependencies
Uses Yarn workspace protocol (`workspace:~`) for internal package dependencies to ensure proper linking during development.

#### Testing Setup
- Custom Jest configuration with module name mapping for workspace packages
- UTC timezone enforcement for consistent test behavior
- Coverage collection across multiple packages
- Special handling for Polkadot packages in transform ignore patterns

#### CLI Command Structure
Commands follow a consistent pattern:
- Input validation using Zod schemas
- Adapter functions for shared logic between CLI and MCP modes
- Structured logging and error handling
- Progress indication using ora spinner

#### MCP Integration
The CLI supports Model Context Protocol for AI tool integration, allowing commands to be executed through AI interfaces like Cursor.

### Build System
- TypeScript compilation with project references
- Template copying for CLI (EJS templates in src/template → lib/template)
- OCLIF manifest generation for command discovery
- Automatic README generation from command help

### Network Support
SubQuery supports multiple blockchain networks:
- Polkadot/Substrate (primary)
- Ethereum and EVM-compatible chains
- Cosmos/CosmWasm
- Algorand, NEAR, Stellar, Solana, Starknet, Concordium

Each network has its own implementation repository, with this repo containing the core Substrate implementation and shared components.

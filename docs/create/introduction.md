# Creating a SubQuery Project

## Basic Workflow

Some of the following examples will assume you have successfully initialized the starter package in the [Quick start](/quickstart) section. From that starter package, we'll walk through the standard process to customise and implement your own SubQuery project.

```shell
subql init --starter PROJECT_NAME
```

More advanced users can jump directly to the resources they need from a fresh project.

Creating a bespoke SubQuery project is usually done in the following manner:
1. Initalise your project using `subql init PROJECT_NAME`
2. Update the Manifest file (`project.yaml`) to include information about your blockchain, and the entities that you will map - see [Manifest File](/create/manifest)
3. Create GraphQL entities in your schema (`schema.graphql`) that define the shape of the data that you will extract and persist for querying - see [GraphQL Schema](/create/graphql)
4. Add all the mapping functions you wish to invoke to transform chain data to the GraphQL entities that you have defined - see [Mapping](/create/mapping)
5. Generate code, build, and publish to SubQuery Projects (or run in your own local node) - see [Running and Querying your Starter Project](/quickstart.html#running-and-querying-your-starter-project) in our quick start guide.


## Directory Structure

Following map provides an overview of the directory structure of a SubQuery project.

```
- project-name
  L package.json
  L project.yaml
  L README.md
  L schema.graphql
  L tsconfig.json
  L docker-compose.yml
  L src
    L index.ts
    L mappings
      L mappingHandlers.ts
```

## Code Generation

Whenever you change your GraphQL entities, you must regenerate your types directory with the following command.

```
yarn codegen
```

This will create a new directory (or update the existing) `src/types` which contains generated entity classes for each type you have defined previously in `schema.graphql`. These classes provide type-safe entity loading, read and write access to entity fields - see more about this process in [the GraphQL Schema](/create/graphql).

## Build 

In order run your SubQuery Project on a locally hosted SubQuery Node, you need to build your work.

Run the build command from the project's root directory.
```shell
# Yarn
yarn build

# NPM
npm run-script build
```

## Logging

The `console.log` method is **no longer supported**. Instead a `logger` module has been injected in the types, which means we can support a logger that can accept various logging levels.

```typescript
logger.info("Info level message")
logger.debug("Debugger level message")
logger.warn("Warning level message")
```

In addition, viewing the debug messages requires adding `--log-level debug` in your command line.

## SubQuery Examples

| Example                   | Description                                          | Keywords     |
|---------------------------|------------------------------------------------------|--------------|
| [extrinsic-finalized-block](https://github.com/subquery/subql-examples/tree/main/extrinsic-finalized-block) | Index extrinsics and so they can be queried by hash. | blockHandler |
| [block-timestamp](https://github.com/subquery/subql-examples/tree/main/block-timestamp) | Indexes timestamp of each finalized block. | callHandler |
| [sum-reward](https://github.com/subquery/subql-examples/tree/main/sum-reward) | Indexes staking bond, reward and slash from events of finalized block. | eventHandler |
| [kitty](https://github.com/subquery/subql-examples/tree/main/kitty) | Indexes birthinfo of kitties. | callHandler, eventHandler, customTypes |
| [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold) | Indexes the least staking amount required for a validator to be elected. | blockHandler, @polkadot/api |
| [entity-relation](https://github.com/subquery/subql-examples/tree/main/entity-relation) | Indexes balance transfers between accounts, also indexes utility batchAll to find out the content of the extrinsic calls | One-to-many, many-to-many relationship |


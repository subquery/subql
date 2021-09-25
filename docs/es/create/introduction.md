# Tutorials & Examples

En la guía [de inicio rápido](/quickstart/quickstart.md) encontraremos un ejemplo para darle una muestra de lo que es SubQuery y cómo funciona. Aquí veremos más de cerca el flujo de trabajo al crear tu proyecto y los archivos clave con los que trabajarás.

## SubQuery Examples
Algunos de los siguientes ejemplos asumirán que ha iniciado con éxito el paquete de inicio en la sección [Inicio rápido](../quickstart/quickstart.md). Desde ese paquete de inicio, pasaremos por el proceso estándar para personalizar e implementar su proyecto SubQuery.

1. Inicia tu proyecto usando `subql init PROJECT_NAME`
2. Actualizar el archivo de manifiesto ( ` project.yaml `) para incluir información sobre tu blockchain, y las entidades que vas a mapear - ver [Archivo de manifiesto](./manifest.md)
3. Crear entidades GraphQL en tu esquema (`schema.graphql`) que definen la forma de los datos que extraerás y persistirá para la consulta - vea [Esquema GraphQL](./graphql.md)
4. Add all the mapping functions (eg `mappingHandlers.ts`) you wish to invoke to transform chain data to the GraphQL entities that you have defined - see [Mapping](./mapping.md)
5. Generate, build, and publish your code to SubQuery Projects (or run in your own local node) - see [Running and Querying your Starter Project](./quickstart.md#running-and-querying-your-starter-project) in our quick start guide.

## Directory Structure

The following map provides an overview of the directory structure of a SubQuery project when the `init` command is run.

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
  L .gitignore
```

Example

![SubQuery directory structure](/assets/img/subQuery_directory_stucture.png)

## Code Generation

Whenever you change your GraphQL entities, you must regenerate your types directory with the following command.

```
yarn codegen
```

This will create a new directory (or update the existing) `src/types` which contain generated entity classes for each type you have defined previously in `schema.graphql`. These classes provide type-safe entity loading, read and write access to entity fields - see more about this process in [the GraphQL Schema](./graphql.md).

## Build

In order to run your SubQuery Project on a locally hosted SubQuery Node, you need to first build your work.

Run the build command from the project's root directory.

<CodeGroup> The `console.log` method is **no longer supported**. Instead, a `logger` module has been injected in the types, which means we can support a logger that can accept various logging levels.

```typescript
logger.info('Info level message');
logger.debug('Debugger level message');
logger.warn('Warning level message');
```

To use `logger.info` or `logger.warn`, just place the line into your mapping file.

![logging.info](/assets/img/logging_info.png)

To use `logger.debug`, an additional step is required. Add `--log-level=debug` to your command line.

If you are running a docker container, add this line to your `docker-compose.yaml` file.

![logging.debug](/assets/img/logging_debug.png)

You should now see the new logging in the terminal screen.

![logging.debug](/assets/img/subquery_logging.png)

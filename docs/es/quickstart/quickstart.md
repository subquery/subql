# Guía de inicio rápido

En esta guía de inicio rápido, vamos a crear un simple proyecto inicial que se puede utilizar como marco para desarrollar su propio Proyecto SubQuery.

Al final de esta guía, tendrá un proyecto de SubQuery funcionando en un nodo de SubQuery con un endpoint GraphQL desde el que puede consultar datos.

Si aún no lo has hecho, te sugerimos familiarizarte con la [terminología](../#terminology) utilizada en SubQuery.

## Preparación

### Entorno de desarrollo local

- [Typescript](https://www.typescriptlang.org/) es necesario para compilar el proyecto y definir tipos.
- Tanto SubQuery CLI como el proyecto generado tienen dependencias y requieren una versión moderna [Node](https://nodejs.org/en/).
- Los nodos SubQuery requieren Docker

### Instalar SubQuery CLI

Instalar SubQuery CLI globalmente en tu terminal usando Yarn o NPM:

```shell
# NPM
npm install -g @subql/cli
```

Tenga en cuenta que **NO** animamos el uso de `yarn global` debido a su mala gestión de dependencias que puede llevar a errores en la línea.

A continuación, puede ejecutar ayuda para ver los comandos disponibles y el uso proporcionado por CLI

```shell
subql help
```

## Inicializar el proyecto de SubQuery de Inicio

Dentro del directorio en el que desea crear un proyecto de SubQuery, simplemente reemplace `PROJECT_NAME` con el propio y ejecute el comando:

```shell
subql init --starter PROJECT_NAME
```

Se le harán ciertas preguntas ya que el proyecto de SubQuery está initalizado:

- Repositorio Git (opcional): Proporcione una URL Git a un repositorio en el que este proyecto de SubQuery será alojado (cuando esté alojado en SubQuery Explorer)
- Endpoint RPC (requerido): Proporcione una URL wss a un endpoint RPC en ejecución que se utilizará por defecto para este proyecto. Puede acceder rápidamente a los endpoints públicos para diferentes redes Polkadot o incluso crear su propio nodo privado dedicado usando [OnFinality](https://app.onfinality.io) o simplemente utilizar el punto final predeterminado de Polkadot.
- Autores (requerido): Introduzca el propietario de este proyecto de Subconsulta aquí
- Descripción (Opcional): Puede proporcionar un párrafo corto sobre su proyecto que describa qué datos contiene y qué pueden hacer los usuarios con él
- Versión (Requerida): Introduzca un número de versión personalizado o utilice el predeterminado (`1.0.0`)
- Licencia (Requerida): Proporcione la licencia de software para este proyecto o acepte el predeterminado (`Apache-2.0`)

Después de completar el proceso de inicialización, debería ver una carpeta con el nombre de su proyecto que se ha creado dentro del directorio. El contenido de este directorio debe ser idéntico a lo que se muestra en la [estructura de directorio](../create/introduction.md#directory-structure).

Last, under the project directory, run following command to install the new project's dependencies.

<CodeGroup> cd PROJECT_NAME # Yarn yarn install # NPM npm install You will mainly be working on the following files:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

For more information on how to write your own SubQuery, check out our documentation under [Create a Project](../create/introduction.md)

### GraphQL Model Generation

In order to [index](../run/run.md) your SubQuery project, you must first generate the required GraphQL models that you have defined in your GraphQL Schema file (`schema.graphql`). Run this command in the root of the project directory.

<CodeGroup> # Yarn yarn codegen # NPM npm run-script codegen

## Build the Project

In order run your SubQuery Project on a locally hosted SubQuery Node, you need to build your work.

Run the build command from the project's root directory.

<CodeGroup> All configuration that controls how a SubQuery node is run is defined in this `docker-compose.yml` file. For a new project that has been just initalised you won't need to change anything here, but you can read more about the file and the settings in our [Run a Project section](../run/run.md)

Under the project directory run following command:

```shell
docker-compose pull && docker-compose up
```

It may take some time to download the required packages ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query), and Postgres) for the first time but soon you'll see a running SubQuery node.

### Query your Project

Open your browser and head to [http://localhost:3000](http://localhost:3000).

You should see a GraphQL playground is showing in the explorer and the schemas that are ready to query. On the top right of the playground, you'll find a _Docs_ button that will open a documentation draw. This documentation is automatically generated and helps you find what entities and methods you can query.

For a new SubQuery starter project, you can try the following query to get a taste of how it works or [learn more about the GraphQL Query language](../query/graphql.md).

```graphql
{
  query {
    starterEntities(first: 10) {
      nodes {
        field1
        field2
        field3
      }
    }
  }
}
```

## Next Steps

Congratulations, you now have a locally running SubQuery project that accepts GraphQL API requests for sample data. In the next guide, we'll show you how to publish your new project to [SubQuery Projects](https://project.subquery.network) and query it using our [Explorer](https://explorer.subquery.network)

[Publish your new project to SubQuery Projects](../publish/publish.md)

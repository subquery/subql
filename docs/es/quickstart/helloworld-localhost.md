# Hello World (localhost + Docker)

Welcome to this SubQuery Hello World quick start. The quick start aims to show you how you get the default starter project running in Docker in a few simple steps.

## Learning objectives

At the end of this quick start, you should:

- understand the required pre-requisites
- understand the basic common commands
- be able to navigate to localhost:3000 and view the playground
- run a simple query to get the block height of the Polkadot mainnet

## Intended audience

This guide is geared towards new developers who have some development experience and are interested in learning more about SubQuery.

## Video guide

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/j034cyUYb7k" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Pre-requisites

You will need:

- yarn or npm package manager
- SubQuery CLI (`@subql/cli`)
- Docker

You can run the following commands in a terminal to see if you already have any of these pre-requisites.

```shell
yarn -v (or npm -v)
subql -v
docker -v
```

For more advanced users, copy and paste the following:

```shell
echo -e "My yarn version is:" `yarn -v` "\nMy subql version is:" `subql -v`  "\nMy docker version is:" `docker -v`
```

This should return: (for npm users, replace yarn with npm)

```shell
My yarn version is: 1.22.10
My subql version is: @subql/cli/0.9.3 darwin-x64 node-v16.3.0
My docker version is: Docker version 20.10.5, build 55c4c88
```

If you get the above, then you are good to go. If not, follow these links to install them:

- [yarn](https://classic.yarnpkg.com/en/docs/install/) or [npm](https://www.npmjs.com/get-npm)
- [SubQuery CLI](quickstart.md#install-the-subquery-cli)
- [Docker](https://docs.docker.com/get-docker/)

## 1. Step 1: Initialise project

The first step when starting off with SubQuery is to run the `subql init` command. Let's initialise a start project with the name `subqlHelloWorld`. Note that only author is mandatory. Everything else is left empty below.

```shell
> subql init --starter subqlHelloWorld
Git repository: RPC endpoint [wss://polkadot.api.onfinality.io/public-ws]:
Authors: sa
Description: Version: [1.0.0]:
License: [Apache-2.0]:
Init the starter package... subqlHelloWorld is ready

```

Don't forget to change into this new directory.

```shell
cd subqlHelloWorld
```

## 2. Step 2: Install dependencies

Now do a yarn or node install to install the various dependencies.

<CodeGroup> # Yarn yarn install # NPM npm install

```shell
> yarn install
yarn install v1.22.10
info No lockfile found.
[1/4] 🔍  Resolving packages...
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
[4/4] 🔨  Building fresh packages...
success Saved lockfile.
✨  Done in 31.84s.
```

## 3. Step 3: Generate code

Now run `yarn codegen` to generate Typescript from the GraphQL schema.

<CodeGroup> # Yarn yarn codegen # NPM npm run-script codegen

```shell
> yarn codegen
yarn run v1.22.10
$ ./node_modules/.bin/subql codegen
===============================
---------Subql Codegen---------
===============================
* Schema StarterEntity generated !
* Models index generated !
* Types index generated !
✨  Done in 1.02s.
* Models index generated !
* Tipo de índice generado!
✨ Hecho en 0.06s.
```

**Advertencia** Cuando se hacen cambios en el archivo de schema, por favor recuerde volver a ejecutar `yarn codegen` para regenerar el directorio de tipos.

## 4. Step 4: Build code

El siguiente paso es construir el código con `yarn build`.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

An example of `yarn build`

```shell
> yarn build
yarn run v1.22.10
$ tsc -b
✨  Done in 5.68s.
```

## 5. Ejecutar Docker

El uso de Docker le permite ejecutar este ejemplo muy rápidamente, ya que toda la infraestructura necesaria se puede proporcionar dentro de la imagen Docker. Ejecuta `docker-compose pull && docker-compose up`.

This will kick everything into life where eventually you will get blocks being fetched.

```shell
> #SNIPPET
subquery-node_1   | 2021-06-05T22:20:31.450Z <subql-node> INFO node started
subquery-node_1   | 2021-06-05T22:20:35.134Z <fetch> INFO fetch block [1, 100]
subqlhelloworld_graphql-engine_1 exited with code 0
subquery-node_1   | 2021-06-05T22:20:38.412Z <fetch> INFO fetch block [101, 200]
graphql-engine_1  | 2021-06-05T22:20:39.353Z <nestjs> INFO Starting Nest application...
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO AppModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO ConfigureModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.383Z <nestjs> INFO GraphqlModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.809Z <nestjs> INFO Nest application successfully started
subquery-node_1   | 2021-06-05T22:20:41.122Z <fetch> INFO fetch block [201, 300]
graphql-engine_1  | 2021-06-05T22:20:43.244Z <express> INFO request completed

```

## 6. Navegar playground

Vaya a http://localhost:3000/ y pegue la siguiente consulta en el lado izquierdo de la pantalla y pulse el botón Reproducir.

```
# Yarn
yarn build

# NPM
npm run-script build

```

Zona de juegos SubQuery en localhost.

![local de playground](/assets/img/subql_playground.png)

El número de bloques en el patio de juego debe coincidir con el número de bloques (técnicamente la altura del bloque) en la terminal también.

## Resúmen

En este inicio rápido, demostramos los pasos básicos para poner en marcha un proyecto inicial dentro de un entorno Docker y luego navegamos a localhost:3000 y ejecutamos una consulta para devolver el número de bloque de la red mainnet Polkadot.

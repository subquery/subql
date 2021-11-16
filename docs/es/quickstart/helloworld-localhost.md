# Hola Mundo (host local + Docker)

Bienvenido a este inicio rápido de SubQuery Hola Mundo. El inicio rápido apunta a mostrarle cómo se ejecuta el proyecto inicial predeterminado en Docker en unos pocos pasos.

## Objetivos de aprendizaje

Al final de este inicio rápido, deberías:

- entender los requisitos requeridos
- entender los comandos básicos comunes
- ser capaz de navegar a localhost:3000 y ver el patio de juegos
- ejecuta una simple consulta para obtener la altura del bloque del mainnet Polkadot

## Audiencia intencionada

Esta guía está dirigida a nuevos desarrolladores que tienen cierta experiencia de desarrollo y están interesados en aprender más sobre SubQuery.

## Guía en vídeo

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/j034cyUYb7k" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Pre-requisitos

Necesitarás:

- gestor de paquetes yarn o npm
- SubQuery CLI (`@subql/cli`)
- Docker

Puede ejecutar los siguientes comandos en un terminal para ver si ya tiene alguno de estos requisitos previos.

```shell
yarn -v (or npm -v)
subql -v
docker -v
```

Para usuarios más avanzados, copie y pegue lo siguiente:

```shell
echo -e "My yarn version is:" `yarn -v` "\nMy subql version is:" `subql -v`  "\nMy docker version is:" `docker -v`
```

Esto debería regresar: (para usuarios de npm, reemplace yarn con npm)

```shell
My yarn version is: 1.22.10
My subql version is: @subql/cli/0.9.3 darwin-x64 node-v16.3.0
My docker version is: Docker version 20.10.5, build 55c4c88
```

Si usted consigue lo anterior, entonces tiene luz verde para continuar. Si no, sigue estos enlaces para instalarlos:

- [yarn](https://classic.yarnpkg.com/en/docs/install/) o [npm](https://www.npmjs.com/get-npm)
- [SubQuery CLI](quickstart.md#install-the-subquery-cli)
- [Docker](https://docs.docker.com/get-docker/)

## 1. Step 1: Initialise project

El primer paso al comenzar con SubQuery es ejecutar el comando `subql init`. Inicialicemos un proyecto inicial con el nombre `subqlHelloWorld`. Tenga en cuenta que sólo el autor es obligatorio. Todo lo demás queda vacío.

```shell
> subql init --starter subqlHelloWorld
Git repository: RPC endpoint [wss://polkadot.api.onfinality.io/public-ws]:
Authors: sa
Description: Version: [1.0.0]:
License: [Apache-2.0]:
Init the starter package... subqlHelloWorld is ready

```

No olvides cambiar a este nuevo directorio.

```shell
cd subqlHelloWorld
```

## 2. Step 2: Install dependencies

Ahora haga una instalación de yarn o node para instalar las distintas dependencias.

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

Ahora ejecuta `yarn codegen` para generar Typescript desde el esquema GraphQL.

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
* Tipo de índice generado!
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

Esto hará que todo salga a la vida donde eventualmente conseguirás que se obtengan bloques.

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

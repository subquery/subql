# Hola Mundo (hospedado en SubQuery)

El objetivo de este rápido inicio es mostrar cómo puede conseguir que el proyecto inicial por defecto se ejecute en SubQuery Projects (nuestro servicio administrado) en unos pocos pasos.

Tomaremos el simple proyecto inicial (y todo lo que hemos aprendido hasta ahora) pero en lugar de ejecutarlo localmente dentro de Docker, aprovecharemos la infraestructura de alojamiento administrada por SubQuery. En otras palabras, dejamos que SubQuery realice todas las tareas pesadas, corriendo y gestionando la infraestructura de producción.

## Objetivos de aprendizaje

Al final de este inicio rápido, deberías:

- entender los requisitos requeridos
- ser capaz de alojar un proyecto en [SubQuery Projects](https://project.subquery.network/)
- ejecuta una simple consulta para obtener la altura del bloque del mainnet Polkadot usando el patio de juego
- ejecuta una simple consulta GET para obtener la altura del bloque del mainnet Polkadot usando cURL

## Audiencia intencionada

Esta guía está dirigida a nuevos desarrolladores que tienen cierta experiencia de desarrollo y están interesados en aprender más sobre SubQuery.

## Guía en vídeo

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Pre-requisitos

Necesitarás:

- tu cuenta de GitHub

## 1. Step 1: Create your project

Vamos a crear un proyecto llamado subql_hellowworld y ejecutar la instalación obligatoria, el código y la compilación con tu gestor de paquetes favorito.

```shell
> subql init --starter subqlHelloWorld
yarn install
yarn codegen
yarn build
```

NO ejecute los comandos docker.

## 2. Step 2: Create a GitHub repo

En GitHub, cree un nuevo repositorio público. Proporcione un nombre y establezca su visibilidad al público. Aquí, todo se mantiene como predeterminado por ahora.

![crear repositorio GitHub](/assets/img/github_create_new_repo.png)

Tome nota de su URL de GitHub, esto debe ser público para SubQuery para acceder a ella.

![crear un repositorio en GitHub](/assets/img/github_repo_url.png)

## 3. Step 3: Push to GitHub

Volver al directorio de tu proyecto, inicialízalo como un directorio git. De lo contrario, podría obtener el error "fatal: no un repositorio git (o cualquiera de los directorios padres): .git"

```shell
git init
```

A continuación, añada un repositorio remoto con el comando:

```shell
git remote add origin https://github.com/seandotau/subqlHelloWorld.git
```

Esto básicamente establece su repositorio remoto en “https://github.com/seandotau/subqlHelloWorld.git” y le da el nombre “origin” que es la nomenclatura estándar para un repositorio remoto en GitHub.

A continuación añadimos el código a nuestro repositorio con los siguientes comandos:

```shell
> git add .
> git commit -m "First commit"
[master (root-commit) a999d88] First commit
10 files changed, 3512 insertions(+)
create mode 100644 .gitignore
create mode 100644 README.md
create mode 100644 docker-compose.yml
create mode 100644 package.json
create mode 100644 project.yaml
create mode 100644 schema.graphql
create mode 100644 src/index.ts
create mode 100644 src/mappings/mappingHandlers.ts
create mode 100644 tsconfig.json
create mode 100644 yarn.lock
> git push origin master
Enumerating objects: 14, done.
Objetos de cuenta: 100% (14/14), hecho.
Compresión delta usando hasta 12 hilos
Compresión de objetos: 100% (13/13), hecho.
Objetos de escritura: 100% (14/14), 59.35 KiB | 8.48 MiB/s, hecho.
Total 14 (delta 0), reutilizado 0 (delta 0)
Para https://github.com/seandotau/subqlHelloWorld.git
 * [nueva rama] master -> master

```

El comando push significa "por favor empuje mi código al repositorio de origen DESDE mi repositorio local maestro". Actualizar GitHub debe mostrar todo el código en GitHub.

![Primer commit](/assets/img/first_commit.png)

Ahora que tienes tu código en GitHub, vamos a ver cómo podemos alojarlo en Proyectos de SubQuery.

## 4. Cree su primer proyecto

Ve a [https://project.subquery.network](https://project.subquery.network) e inicia sesión con tu cuenta de GitHub.

![Bienvenido a los proyectos de SubQuery](/assets/img/welcome_to_subquery_projects.png)

Luego crea un nuevo proyecto,

![Bienvenido a los proyectos de SubQuery](/assets/img/subquery_create_project.png)

Y rellene los distintos campos con los detalles apropiados.

- **Cuenta de GitHub:** Si tienes más de una cuenta de GitHub, selecciona la cuenta bajo la que se creará este proyecto. Los proyectos creados en una cuenta de la organización de GitHub son compartidos entre los miembros de esa organización de GitHub.
- **Nombre del proyecto:** Dale un nombre a tu proyecto aquí.
- **Subtítulo:** Proporcione un subtítulo para su proyecto.
- **Descripción:** Explica lo que hace tu proyecto de SubQuery.
- **URL del repositorio de GitHub:** Esta debe ser una URL válida de GitHub para un repositorio público que contiene su proyecto de SubQuery. El archivo schema.graphql debe estar en la raíz de su directorio.
- **Ocultar proyecto:** Si se selecciona, esto ocultará el proyecto del explorador público de SubQuery. ¡Mantén esta opción sin seleccionar si quieres compartir tu SubQuery con la comunidad!

![Crear parámetros de SubQuery](/assets/img/create_subquery_project_parameters.png)

Cuando hagas clic en crear, serás llevado a tu panel de control.

![Panel de SubQuery del proyecto](/assets/img/subquery_project_dashboard.png)

El panel de control contiene mucha información útil como la red que está usando, la URL del repositorio de GitHub del código fuente que está ejecutando, cuando fue creado y actualizado, y en particular los detalles de implementación.

## 5. Step 5: Deploy your project

Ahora que ha creado su proyecto en SubQuery Projects, configurando el comportamiento de la pantalla, el siguiente paso es desplegar su proyecto haciéndolo operativo. Desplegar una versión activa una nueva operación de indexación de SubQuery para iniciar, y configurar el servicio de consultas requerido para comenzar a aceptar solicitudes GraphQL. También puede desplegar nuevas versiones a proyectos existentes aquí.

Usted puede elegir desplegar en varios entornos tales como una ranura para producción o un espacio para escenas. Aquí vamos a desplegar en una ranura de producción. Al hacer clic en el botón "Desplegar" aparece una pantalla con los siguientes campos:

![Desplegar a la ranura de producción](/assets/img/deploy_production_slot.png)

- **Commit Hash de la nueva versión:** Desde GitHub seleccione el commit correcto del código base del proyecto SubQuery que desea desplegar
- **Versión del indexador:** Esta es la versión del servicio de nodos de SubQuery en la que desea ejecutar esta SubQuery. Ver [@subql/node](https://www.npmjs.com/package/@subql/node)
- **Versión de consulta:** Esta es la versión del servicio de consulta de SubQuery en la que desea ejecutar esta SubQuery. Ver [@subql/query](https://www.npmjs.com/package/@subql/query)

Dado que solo tenemos un compromiso, solo hay una opción en la caída hacia abajo. También trabajaremos con la última versión del indexador y la versión de consulta, así que aceptaremos los valores por defecto y luego haremos clic en "Desplegar actualización".

Luego verás tu despliegue en el estado "Procesando". Aquí, tu código se está desplegando en la infraestructura administrada de SubQuery. Básicamente, un servidor se está volviendo sobre la demanda y se está proporcionando para usted. ¡Esto tomará unos minutos así que tenemos tiempo para tomar un café!

![Procesamiento de despliegue](/assets/img/deployment_processing.png)

El despliegue ya está en marcha.

![Despliegue en ejecución](/assets/img/deployment_running.png)

## 6. Step 6: Testing your project

Para probar su proyecto, haga clic en los 3 ellipsis y seleccione "Ver en SubQuery Explorer".

![Ver proyecto de SubQuery](/assets/img/view_on_subquery.png)

Esto le llevará al siempre familiar "Playground" donde puede hacer clic en el botón de reproducción y ver los resultados de la consulta.

![Zona de juego SubQuery](/assets/img/subquery_playground.png)

## 7. Step 7: Bonus step

Para el astuto entre nosotros, recordarán que en los objetivos de aprendizaje, el último punto fue ejecutar una simple consulta de GET. Para hacer esto, necesitaremos tomar el "Query Endpoint" que se muestra en los detalles de la implementación.

![Query endpoing](/assets/img/query_endpoint.png)

A continuación, puede enviar una solicitud GET a este endpoint utilizando su cliente favorito, como [Postman](https://www.postman.com/) o [Mockoon](https://mockoon.com/) o vía cURL en su terminal. Para la simplicidad, cURL se mostrará a continuación.

El comando curl a ejecutar es:

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

proporcionando los resultados de:

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

La capacidad de lectura no es una preocupación aquí ya que probablemente tendrá algún código de frente para consumir y analizar esta respuesta JSON.

## Resúmen

En este inicio rápido de SubQuery mostramos lo rápido y fácil que fue tomar un proyecto Subql y desplegarlo en [SubQuery Projects](https://project.subquery.network) donde toda la infraestructura, se proporciona para su conveniencia. Hay un patio de juego inconstruido para ejecutar varias consultas, así como un endpoint API para que tu código se integre.

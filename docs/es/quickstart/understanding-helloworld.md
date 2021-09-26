# Hello World Explained

In the [Hello World quick start guide](helloworld-localhost.md), we ran through some simple commands and very quickly got an example up and running. This allowed you to ensure that you had all the pre-requisites in place and could use a local playground to make a simple query to get your first data from SubQuery. Here, we take a closer look at what all those commands mean.

## subql init

The first command we ran was `subql init --starter subqlHelloWorld`.

This does the heavy lifting and creates a whole bunch of files for you. As noted in the [official documentation](quickstart.md#configure-and-build-the-starter-project), you will mainly be working on the following files:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

![key subql files](/assets/img/main_subql_files.png)

These files are the core of everything we do. As such, we'll dedicate more time to these files in another article. For now though, just know that the schema contains a description of the data users can request from the SubQuery API, the project yaml file which contains "configuration" type parameters and of course the mappingHandlers containing typescript which contains functions that transform the data.

## yarn install

The next thing we did was `yarn install`. `npm install` can be used as well.

> A short history lesson. Node Package Manager or npm was initially released in 2010 and is a tremendously popular package manager among JavaScript developers. It is the default package that is automatically installed whenever you install Node.js on your system. Yarn was initially released by Facebook in 2016 with the intention to address some of the performance and security shortcomings of working with npm (at that time).

What yarn does is look at the `package.json` file and download various other dependencies. Mira el archivo`package.json`, no parece que haya muchas dependencias, pero cuando ejecutas el comando, notarás que se añaden 18.983 archivos. Esto se debe a que cada dependencia también tendrá sus propias dependencias.

![archivos subql clave](/assets/img/dependencies.png)

## yarn codegen

Luego corrimos `yarn codegen` o `npm run-script codegen`. Lo que esto hace es obtener el esquema GraphQL (en el esquema `schema.graphql`) y genera los archivos de modelo de tipo asociados (por lo tanto, los archivos de salida tendrán una extensión .ts). Nunca debería cambiar ninguno de estos archivos generados, sólo cambiar el archivo fuente `schema.graphql`.

![archivos subql clave](/assets/img/typescript.png)

## yarn build

`yarn build` o `npm run-script build` fue ejecutado. Esto debería ser familiar para programadores experimentados. Crea una carpeta de distribución que realiza cosas como la optimización del código preparándose para una implementación.

![archivos subql clave](/assets/img/distribution_folder.png)

## docker-compose

El paso final fue el comando combinado docker `docker-compose pull && docker-compose up` (también se puede ejecutar por separado). El comando `pull` agarra todas las imágenes necesarias de Docker Hub y el comando `up` inicia el contenedor.

```shell
> docker-compose pull
Pulling postgres        ... done
Pulling subquery-node   ... done
Pulling graphql-engine  ... done
```

Cuando el contenedor se inicia, verá que el terminal escupe un montón de texto mostrando el estado del nodo y el motor GraphQL. Es cuando se ve:

```
subquery-node_1   | 2021-06-06T02:04:25.490Z <fetch> INFO fetch block [1, 100]
```

que sabe que el nodo SubQuery ha comenzado a sincronizar.

## Resúmen

Ahora que has tenido una visión de lo que está ocurriendo debajo de las cubiertas, la pregunta es ¿a dónde ir desde aquí? Si te sientes seguro, puedes ir aprendiendo sobre cómo [crear un proyecto](../create/introduction.md) y aprender más sobre los tres archivos clave. El archivo manifiesto, el esquema GraphQL y el archivo de mapeos.

De lo contrario, continúe a nuestra sección de tutoriales donde veremos cómo podemos ejecutar este ejemplo de Hola Mundo en la infraestructura alojada de SubQuery. revisaremos la modificación del bloque de inicio, y haremos una inmersión más profunda en la ejecución de proyectos de SubQuery ejecutando proyectos de código abierto y de fácil acceso.

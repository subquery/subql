# Hola mundo explicado

En la guía de inicio rápido [Hola World](helloworld-localhost.md), corrimos algunos comandos simples y muy rápidamente conseguimos un ejemplo en ejecución. Esto le permitió asegurarse de que tenía todos los requisitos previos en su lugar y podía usar un patio de juego local para hacer una simple consulta para obtener sus primeros datos de SubQuery. Aquí, echamos un vistazo más de cerca a lo que significan todos esos comandos.

## subql init

El primer comando que ejecutamos fue `subql init --starter subqlHelloWorld`.

Esto hace el trabajo pesado y crea un montón de archivos para usted. Como se indica en la [documentación oficial](quickstart.md#configure-and-build-the-starter-project), trabajará principalmente en los siguientes archivos:

- El manifiesto en `project.yaml`
- El esquema GraphQL en `schema.graphql`
- Las funciones de mapeo en el directorio `src/mappings/`

![archivos subql clave](/assets/img/main_subql_files.png)

Estos archivos son el núcleo de todo lo que hacemos. Como tal, dedicaremos más tiempo a estos archivos en otro artículo. Sin embargo, por ahora sólo sabe que el esquema contiene una descripción de los datos que los usuarios pueden solicitar de la API de SubQuery, el archivo yaml del proyecto que contiene parámetros de tipo "configuración" y por supuesto el mapeo de Handlers conteniendo typescript que contiene funciones que transforman los datos.

## yarn install

Lo siguiente que hicimos fue `yarn install`. `npm install` también puede ser usado.

> Una breve lección de historia. Node Package Manager o npm se publicó inicialmente en 2010 y es un gestor de paquetes muy popular entre los desarrolladores de JavaScript. Es el paquete predeterminado que se instala automáticamente cuando instala Node.js en su sistema. Yarn fue lanzado inicialmente por Facebook en 2016 con la intención de abordar algunas de las deficiencias de rendimiento y seguridad de trabajar con npm (en ese momento).

Lo que yarn hace es echar un vistazo al archivo `package.json` y descargar varias dependencias. Mira el archivo`package.json`, no parece que haya muchas dependencias, pero cuando ejecutas el comando, notarás que se añaden 18.983 archivos. Esto se debe a que cada dependencia también tendrá sus propias dependencias.

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

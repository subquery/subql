# ¿Cómo ejecutar un nodo indexador?

## Guía en vídeo

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/QfNsR12ItnA" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Introducción

Ejecutar un nodo indexador es otra opción fuera de usar Docker o tener un proyecto alojado para usted en [SubQuery Projects](https://project.subquery.network/). Requiere más tiempo y esfuerzo, pero mejorará su comprensión de cómo trabaja SubQuery bajo las cubiertas.

## Postgres

Ejecutar un nodo indexador en su infraestructura requerirá la configuración de una base de datos de Postgres. Puede instalar Postgres desde [aquí](https://www.postgresql.org/download/) y asegurarse de que la versión es 12 o mayor.

## Instalar subql/node

Luego para ejecutar un nodo SubQuery, ejecute el siguiente comando:

```shell
npm install -g @subql/node
```

El parámetro -g significa instalarlo globalmente, lo que significa que en OSX, la ubicación será /usr/local/lib/node_modules.

Una vez instalado, puede comprobar la versión ejecutando:

```shell
> subql-node --version
0.19.1
```

## Configurando la Base de Datos

A continuación, necesita configurar las siguientes variables de entorno:

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
```

Por supuesto, si tiene diferentes valores para las claves de arriba, por favor ajuste en consecuencia. Tenga en cuenta que el comando `env` mostrará las variables de entorno actuales y que este proceso sólo establece estos valores temporalmente. Es decir, sólo son válidos durante la sesión de la terminal. Para establecerlos permanentemente, guárdelos en tu ~/bash_profile en su lugar.

## Indexar un proyecto

Para comenzar a indexar un proyecto, navega en la carpeta de tu proyecto y ejecuta el siguiente comando:

```shell
subql-node -f .
```

Si no tienes un proyecto práctico, `git clone https://github.com/subquery/subql-helloworld`. Deberías ver el nodo indexador patear a la vida y comenzar a indexar bloques.

## Inspección de Postgres

Si navega a Postgres, verá dos tablas creadas. `public.subqueries` y `subquery_1.starter_entities`.

`public.subqueries` sólo contiene 1 fila de la que el indexador comprueba al inicio para "entender el estado actual" para que sepa desde dónde continuar. La tabla `starter_entities` contiene los índices. Para ver los datos, ejecute `select (*) desde subquery_1.starter_entities`.

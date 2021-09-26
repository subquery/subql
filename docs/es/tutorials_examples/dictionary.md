# ¿Cómo funciona un diccionario SubQuery?

La idea completa de un proyecto de diccionario genérico es indexar todos los datos de un blockchain y registrar los eventos, extrinsics, y sus tipos (módulo y método) en una base de datos en orden de altura de bloques. Otro proyecto puede consultar este endpoint `network.dictionary` en lugar del `network.endpoint` predeterminado definido en el archivo manifest.

El endpoint `network.dictionary` es un parámetro opcional que si está presente, el SDK detectará y usará automáticamente. `network.endpoint` es obligatorio y no compilará si no está presente.

Tomando como ejemplo el proyecto de diccionario de [SubQuery](https://github.com/subquery/subql-dictionary), el archivo [del esquema](https://github.com/subquery/subql-dictionary/blob/main/schema.graphql) define 3 entidades; extrínseco, eventos, specVersion. Estas 3 entidades contienen 6, 4 y 2 campos respectivamente. Cuando se ejecuta este proyecto, estos campos se reflejan en las tablas de la base de datos.

![tabla extrínsecos](/assets/img/extrinsics_table.png) ![tabla de eventos](/assets/img/events_table.png) ![tabla de specversion](/assets/img/specversion_table.png)

Los datos del blockchain se almacenan en estas tablas e indexados para su rendimiento. El proyecto está alojado en SubQuery Projects y el endpoint API está disponible para ser añadido al archivo de manifiesto.

## ¿Cómo incorporar un diccionario en su proyecto?

Añade el diccionario `: https://api.subquery.network/sq/subquery/dictionary-polkadot` a la sección de red del manifiesto. Por ejemplo:

```shell
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
```

## ¿Qué sucede cuando un diccionario NO se utiliza?

Cuando un diccionario NO es usado, un indexador obtendrá todos los datos de bloque a través de la api polkadot de acuerdo con la bandera `tamaño del lote` que es 100 por defecto, y coloque esto en un búfer para procesarlo. Más tarde, el indexador toma todos estos bloques del buffer y mientras procesa los datos del bloque comprueba si el evento y extrínseco en estos bloques coinciden con el filtro definido por el usuario.

## ¿Qué sucede cuando se utiliza un diccionario?

Cuando se utiliza un diccionario, el indexador tomará primero los filtros de llamadas y eventos como parámetros y lo fusionará en una consulta GraphQL. A continuación, utiliza la API del diccionario para obtener una lista de alturas de bloque relevantes sólo que contiene los eventos específicos y extrínsecos. A menudo esto es sustancialmente inferior a 100 si se utiliza el valor por defecto.

Por ejemplo, imagina una situación en la que indexas eventos de transferencia. No todos los bloques tienen este evento (en la imagen inferior no hay eventos de transferencia en los bloques 3 y 4).

![bloque de diccionario](/assets/img/dictionary_blocks.png)

El diccionario permite que tu proyecto se salte esto en lugar de buscar en cada bloque un evento de transferencia, se salta a los bloques 1, 2 y 5. Esto se debe a que el diccionario es una referencia precalculada a todas las llamadas y eventos de cada bloque.

Esto significa que el uso de un diccionario puede reducir la cantidad de datos que el indexador obtiene de la cadena y reducir el número de bloques “no deseados” almacenados en el búfer local. Pero en comparación con el método tradicional, añade un paso adicional para obtener datos de la API del diccionario.

## ¿Cuándo un diccionario NO es útil?

Cuando [manejadores de bloques](https://doc.subquery.network/create/mapping.html#block-handler) se utilizan para extraer datos de una cadena, cada bloque necesita ser procesado. Por lo tanto, el uso de un diccionario en este caso no proporciona ninguna ventaja y el indexador cambiará automáticamente al enfoque no diccionario predeterminado.

También, cuando se trata de eventos o extrínsecos que ocurren o existen en cada bloque como `timestamp.set`, el uso de un diccionario no ofrecerá ninguna ventaja adicional.

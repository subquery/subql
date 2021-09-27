# ¿Cómo empezar a una altura de bloque diferente?

## Guía en vídeo

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Introducción

De forma predeterminada, todos los proyectos iniciales comienzan a sincronizar el blockchain del bloque génesis. En otras palabras, del bloque 1. Para blockchains grandes, esto puede tardar días o incluso semanas en sincronizarse completamente.

Para iniciar una sincronización de nodo de SubQuery desde una altura diferente a cero, todo lo que tiene que hacer es modificar su proyecto, el archivo project.yaml y cambiar la tecla startBlock.

Debajo hay un archivo project.yaml donde el bloque de inicio se ha establecido a 1.000.000

```shell
specVersion: 0.0.1
description: ""
repository: ""
schema: ./schema.graphql
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1000000
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
```

## ¿Por qué no partir de cero?

La razón principal es que puede reducir el tiempo para sincronizar la cadena de bloques. Esto significa que si solo estás interesado en las transacciones en los últimos 3 meses, sólo puedes sincronizar los últimos 3 meses que valgan la pena significar menos tiempo de espera y puedes comenzar tu desarrollo más rápido.

## ¿Cuáles son los inconvenientes de no partir de cero?

El inconveniente más obvio será que no podrá consultar datos en la cadena de bloques que no tiene.

## ¿Cómo averiguar la altura actual del blockchain?

Si está utilizando la red Polkadot, puede visitar [https://polkascan.io/](https://polkascan.io/), seleccionar la red y ver la figura "Bloque Finalizado".

## ¿Tengo que hacer una reconstrucción o un códegen?

No. Debido a que está modificando el archivo project.yaml, que es esencialmente un archivo de configuración, no tendrá que reconstruir o regenerar el código de typescript.

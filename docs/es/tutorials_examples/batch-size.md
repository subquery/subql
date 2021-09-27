# ¿Cómo cambiar el tamaño del lote de la búsqueda en cadena de bloques?

## Guía en vídeo

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Introducción

El tamaño del lote por defecto es 100, pero esto se puede cambiar usando el comando extra `--batch-size=xx`.

Necesitas esto a la línea de comandos como una bandera extra o si estás usando Docker, modificar el docker-compose.yml con:

```shell
subquery-node:
    image: onfinality/subql-node:latest
    depends_on:
      - "postgres"
    restart: always
    environment:
      DB_USER: postgres
      DB_PASS: postgres
      DB_DATABASE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
    volumes:
      - ./:/app
    command:
      - -f=/app
      - --local
      - --batch-size=50

```

Este ejemplo establece el tamaño del lote a 50.

## ¿Por qué cambiar el tamaño del lote?

Usar un tamaño por lotes más pequeño puede reducir el uso de memoria y no dejar a los usuarios colgando para grandes consultas. En otras palabras, su aplicación puede ser más receptiva. 
# 如何更改区块链获取批量大小?

## 视频教程

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 简介

默认的批处理大小是 100，但可以通过命令 `--batch-size=xx` 来改变。

You need to this to the command line as an extra flag or if you are using Docker, modify the docker-compose.yml with:

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

This example sets the batch size to 50.

## Why change the batch size?

Using a smaller batch size can reduce memory usage and not leave users hanging for large queries. In otherwords, your application can be more responsive. 
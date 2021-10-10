# 如何更改区块链批处理大小?

## 视频教程

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/l9jvKWKmRfs" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 简介

默认的批处理大小是 100，但可以通过命令 `--batch-size=xx` 来改变。

你需要在命令行中特殊标记，或者如果你正在使用 Docker，修改docker-compose.yml

```shell
subquery-node:
    image: onfinality/subql-node:latest
    depends_on:
      - "postgres"
    resting: always
    environment:
      DB_USER: postgres
      DB_PASS: postgres
      DB_DATABASE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
    volumes:
      - . :app
    command:
      - -f=/app
      - --local
      - --batch-size=50

```

此配置将批处理大小设置为50。

## 为什么要改变批处理大小？

使用较小的批量大小可以减少内存使用，而不会让用户挂起大量查询。 换言之，您的应用程序响应速度更快。 
# 블록체인 가져오기 배치 크기를 변경하는 방법은 무엇입니까?

## 비디오 가이드

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 소개

기본 배치 크기는 100이지만 추가 명령 `--batch-size=xx`을 사용하여 변경할 수 있습니다.

이를 추가 플래그로 명령줄에 추가하거나 Docker를 사용하는 경우 다음을 사용하여 docker-compose.yml을 수정해야 합니다.

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

이 예에서는 배치 크기를 50으로 설정합니다.

## 배치 크기를 변경하는 이유는 무엇입니까?

더 작은 배치 크기를 사용하면 메모리 사용량을 줄이고 사용자가 큰 쿼리에 매달리지 않도록 할 수 있습니다. 즉, 애플리케이션의 응답성이 향상될 수 있습니다. 
# 블록체인의 설치 뱃지 크기를 변경하려면 어떻게 해야 합니까?

## 비디오 가이드

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 소개

기본 뱃지 사이즈는 100 이지만, 이는 추가 명령어 `--batch-size=xx`를 사용하여 변경할 수 있습니다.

이는 추가 플래그로 명령줄에 대해 수행해야 합니다. 도커를 사용하는 경우에는 docker-compose.yml을 다음과 같이 변경합니다:

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

본 예에서는 배치 사이즈를 50으로 설정합니다.

## 왜 뱃지 크기를 변경하나요?

배치 크기를 작게 하면 메모리 사용량이 줄어들어 사용자가 큰 query를 받지 않게 됩니다. 즉, 애플리케이션의 응답성이 향상됩니다. 
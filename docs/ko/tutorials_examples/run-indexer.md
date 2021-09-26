# 인덱서 노드를 실행하는 방법은 무엇인가요?

## 비디오 가이드

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/QfNsR12ItnA" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 소개

인덱서 노드를 실행하는 것은 Docker를 사용하거나 [SubQuery 프로젝트](https://project.subquery.network/)에서 프로젝트를 호스팅하는 것 외에 다른 옵션입니다. 더 많은 시간과 노력이 필요하지만 SubQuery가 어떻게 작동하는지 이해하는 데 도움이 됩니다.

## Postgres

인프라에서 인덱서 노드를 실행하려면 Postgres 데이터베이스를 설정해야 합니다. [여기](https://www.postgresql.org/download/)에서 Postgres를 설치하고 버전이 12 이상인지 확인할 수 있습니다.

## Subql/노드 설치

SubQuery 노드를 실행하려면, 다음 명령을 실행합니다.

```shell
npm install -g @subql/node
```

-g 플래그는 OSX에서 위치가 /usr/local/lib/node_modules가 됨을 의미하는 전역적으로 설치함을 의미합니다.

설치가 완료되면 다음을 실행하여 버전을 확인할 수 있습니다.

```shell
> subql-node --version
0.19.1
```

## DB 구성 설정

다음으로, 다음 환경 변수를 설정해야 합니다.

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
```

물론, 위의 키들이 다른 값이 있는 경우, 그에 따라 조정하십시오. `env` 명령은 현재 환경 변수를 표시하며 이 프로세스는 이러한 값만 임시로 설정합니다. That is, they are only valid for the duration of the terminal session. To set them permanently, store them in your ~/bash_profile instead.

## Indexing a project

To start indexing a project, navigate into your project folder and run the following command:

```shell
subql-node -f .
```

If you do not have a project handy, `git clone https://github.com/subquery/subql-helloworld`. You should see the indexer node kick into life and start indexing blocks.

## Inspecting Postgres

If you navigate to Postgres, you should see two tables created. `public.subqueries` and `subquery_1.starter_entities`.

`public.subqueries` only contains 1 row which the indexer checks upon start up to “understand the current state” so it knows where to continue from. The `starter_entities` table contains the indexes. To view the data, run `select (*) from subquery_1.starter_entities`.

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

물론, 위의 키들이 다른 값이 있는 경우, 그에 따라 조정하십시오. `env` 명령은 현재 환경 변수를 표시하며 이 프로세스는 이러한 값만 임시로 설정합니다. 즉, 터미널 세션 동안에만 유효합니다. 영구적으로 설정하려면, 대신 ~/bash_profile에 저장하십시오.

## 프로젝트 인덱싱

프로젝트 인덱싱을 시작하려면, 프로젝트 폴더로 이동하여 다음 명령을 실행합니다.

```shell
subql-node -f .
```

편한 프로젝트가 없다면, `git clone https://github.com/subquery/subql-helloworld`하십시오. 인덱서 노드가 작동하고 블록 인덱싱을 시작하는 것을 볼 수 있습니다.

## Postgres 검사

Postgres로 이동하면, 두 개의 테이블이 생성된 것을 볼 수 있습니다. `public.subqueries` and `subquery_1.starter_entities`.

`public.subqueries`는 시작 시 "현재 상태를 이해"하기 위해 인덱서가 확인하는 행을 하나만 포함하므로 계속되는 위치를 알 수 있습니다. `starter_entities` 테이블에는 인덱스가 포함되어 있습니다. 데이터를 보려면 `subquery_1.starter_entities에서 select(*)`를 실행합니다.

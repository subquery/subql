# 로컬에서 하위 쿼리 실행

이 가이드는 인덱서와 쿼리 서비스를 모두 포함하는 인프라에서 로컬 SubQuery 노드를 실행하는 방법을 설명합니다. 자체 SubQuery 인프라를 실행하는 것에 대해 걱정하고 싶지 않으세요? SubQuery는 커뮤니티에 [관리 호스팅 서비스](https://explorer.subquery.network)를 무료로 제공합니다. [게시 가이드](../publish/publish.md)를 따라 프로젝트를 [SubQuery 프로젝트](https://project.subquery.network)에 업로드하는 방법을 확인하세요.

## 도커 사용

다른 솔루션은 `docker-compose.yml` 파일로 정의된 <strong>Docker Container</strong>를 실행하는 것입니다. 방금 초기화된 새 프로젝트의 경우 여기에서 아무 것도 변경할 필요가 없습니다.

프로젝트 디렉터리에서 다음 명령을 실행합니다.

```shell
docker-compose pull && docker-compose up
```

필요한 패키지([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query) 및 Postgres) 를 처음 다운로드하는 데 시간이 걸릴 수 있지만 곧 실행 중인 것을 볼 수 있습니다. 서브쿼리 노드.

## 인덱서 실행 (subql/node)

요구 사항:

- [Postgres](https://www.postgresql.org/) 데이터베이스(버전 12 이상). [SubQuery 노드](#start-a-local-subquery-node)가 블록체인을 인덱싱하는 동안 추출된 데이터는 외부 데이터베이스 인스턴스에 저장됩니다.

SubQuery 노드는 SubQuery 프로젝트별로 기판 기반 블록체인 데이터를 추출하고 이를 Postgres 데이터베이스에 저장하는 구현입니다.

### 설치

```shell
# NPM
npm install -g @subql/node
```

`yarn global`의 사용을 권장하지 **않습니다**. 잘못된 종속성 관리로 인해 오류가 발생할 수 있기 때문입니다.

설치가 완료되면 다음 명령으로 노드를 시작할 수 있습니다.

```shell
subql-node <command>
```

### 주요 명령

다음 명령은 SubQuery 노드 구성을 완료하고 인덱싱을 시작하는 데 도움이 됩니다. 자세히 알아보려면 언제든지 `--help`를 실행할 수 있습니다.

#### 로컬 프로젝트 경로를 가리킴

```
subql-node -f your-project-path
```

#### Using a Dictionary

전체 체인 사전을 사용하면 테스트 중 또는 첫 번째 색인 중에 SubQuery 프로젝트 처리 속도를 크게 높일 수 있습니다. 어떤 경우에는 인덱싱 성능이 최대 10배까지 향상되는 것을 보았습니다.

전체 체인 사전은 특정 체인 내의 모든 이벤트 및 외부 요소의 위치를 미리 인덱싱하고 인덱싱할 때 노드 서비스가 각 블록을 검사하는 대신 관련 위치로 건너뛸 수 있도록 합니다.

`project.yaml` 파일([매니페스트 파일](../create/manifest.md) 참조)에 사전 끝점을 추가하거나 다음 명령을 사용하여 런타임에 지정할 수 있습니다.

```
subql-node --network-dictionary=https://api.subquery.network/sq/subquery/dictionary-polkadot
```

[SubQuery 사전 작동 방식에 대해 자세히 알아보기](../tutorials_examples/dictionary.md)

#### 데이터베이스에 연결

```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
subql-node -f your-project-path 
````
Postgres 데이터베이스의 구성(예: 다른 데이터베이스 비밀번호)에 따라 인덱서(`subql/node`)와 쿼리 서비스(`subql/query`)가 모두 연결할 수 있는지 확인하십시오.

#### 구성 파일 지정

```
subql-node -c your-project-config.yml
```

그러면 쿼리 노드가 YAML 또는 JSON 형식일 수 있는 구성 파일을 가리킵니다. Check out the example below.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### 블록 가져오기 배치 크기 변경

```
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

인덱서가 체인을 처음 인덱싱할 때 단일 블록을 가져오면 성능이 크게 저하됩니다. 가져오는 블록 수를 조정하기 위해 배치 크기를 늘리면 전체 처리 시간이 줄어듭니다. 현재 기본 배치 크기는 100입니다.

#### Local mode

```
subql-node -f your-project-path --local
```

디버깅을 위해 사용자는 로컬 모드에서 노드를 실행할 수 있습니다. 로컬 모델로 전환하면 기본 스키마 `public`에 Postgres 테이블이 생성됩니다.

로컬 모드를 사용하지 않는 경우 초기 `subquery_` 및 해당 프로젝트 테이블이 있는 새 Postgres 스키마가 생성됩니다.


#### 노드 상태 확인

실행 중인 SubQuery 노드의 상태를 확인하고 모니터링하는 데 사용할 수 있는 2개의 엔드포인트가 있습니다.

- 간단한 200 응답을 반환하는 상태 확인 엔드포인트
- 실행 중인 SubQuery 노드에 대한 추가 분석을 포함하는 메타데이터 엔드포인트

이것을 SubQuery 노드의 기본 URL에 추가합니다. 예를 들어 `http://localhost:3000/meta`는 다음을 반환합니다.

```bash
{
    "currentProcessingHeight": 1000699,
    "currentProcessingTimestamp": 1631517883547,
    "targetHeight": 6807295,
    "bestHeight": 6807298,
    "indexerNodeVersion": "0.19.1",
    "lastProcessedHeight": 1000699,
    "lastProcessedTimestamp": 1631517883555,
    "uptime": 41.151789063,
    "polkadotSdkVersion": "5.4.1",
    "apiConnected": true,
    "injectedApiConnected": true,
    "usingDictionary": false,
    "chain": "Polkadot",
    "specName": "polkadot",
    "genesisHash": "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
    "blockTime": 6000
}
```

`http://localhost:3000/health`는 성공하면 HTTP 200을 반환합니다.

인덱서가 정상이 아니면 500 오류가 반환됩니다. 인덱서가 정상이 아니면 500 오류가 반환됩니다.

```shell
{
    "status": 500,
    "error": "Indexer is not healthy"
}
```

잘못된 URL을 사용하면 404 찾을 수 없음 오류가 반환됩니다.

```shell
{
"statusCode": 404,
"message": "Cannot GET /healthy",
"error": "Not Found"
}
```

#### 프로젝트 디버그

[노드 검사기](https://nodejs.org/en/docs/guides/debugging-getting-started/)를 사용하여 다음 명령어를 실행하세요.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

예를 들어:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad에서 수신하는 디버거
도움이 필요하면 https://nodejs.org/en/docs/inspector를 참조하세요.
디버거가 연결되었습니다.
```
그런 다음 Chrome 개발 도구를 열고 소스 > 파일 시스템을 만들고 프로젝트를 작업 공간에 추가하고 디버깅을 시작합니다. 자세한 내용은 다음을 확인하세요. [SubQuery 프로젝트를 디버그하는 방법](https://doc.subquery.network/tutorials_examples/debug-projects/)
## 쿼리 서비스 실행(subql/query)

### 설치

```shell
# NPM
npm install -g @subql/query
```

`yarn global`의 사용을 권장하지 **않습니다**. 잘못된 종속성 관리로 인해 오류가 발생할 수 있기 때문입니다.

### 쿼리 서비스 실행
``` export DB_HOST=localhost subql-query --name <project_name> --playground ````

[프로젝트를 초기화](../quickstart/quickstart.md#initialise-the-starter-subquery-project)할 때 프로젝트 이름이 프로젝트 이름과 동일한지 확인하세요. 또한 환경 변수가 올바른지 확인하십시오.

Subql-query 서비스를 성공적으로 실행한 후 브라우저를 열고 `http://localhost:3000`으로 이동합니다. Explorer에 표시되는 GraphQL 플레이그라운드와 쿼리할 준비가 된 스키마가 표시되어야 합니다.

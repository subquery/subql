# 빠른 시작 가이드

이 빠른 시작 가이드에서는, 자체 SubQuery 프로젝트를 개발하기 위한 프레임워크로 사용할 수 있는 간단한 시작 프로젝트를 만들 것입니다.

이 가이드가 끝나면, 데이터를 쿼리할 수 있는 GraphQL 끝점이 있는 SubQuery 노드에서 실행 중인 SubQuery 프로젝트를 만들 수 있습니다.

아직 익숙하지 않은 경우, 우리는 귀하가 SubQuery에서 사용되는 [용어](../#terminology)에 익숙해지기를 권장합니다.

## 준비

### Local 개발 환경

- 프로젝트를 컴파일하고 유형을 정의하려면 [Typescript](https://www.typescriptlang.org/)가 필요합니다.
- SubQuery CLI와 생성된 프로젝트 모두 종속성이 있으며 최신 버전의 [Node.js](https://nodejs.org/en/)가 필요합니다.
- SubQuery 노드에는 Docker가 필요합니다.

### SubQuery CLI 설치

NPM을 사용하여 터미널에 전역적으로 SubQuery CLI를 설치합니다.

```shell
# NPM
npm install -g @subql/cli
```

잘못된 종속성 관리로 인해 오류가 발생할 수 있으므로 `yarn global` 사용을 권장하지 **않습니다**.

그런 다음 도움말을 실행하여 CLI에서 제공하는 사용 가능한 명령 및 사용법을 볼 수 있습니다.

```shell
subql help
```

## 스타터 SubQuery 프로젝트 초기화

SubQuery 프로젝트를 생성하려는 디렉터리 내에서 `PROJECT_NAME`을 자신의 것으로 바꾸고 다음 명령을 실행하기만 하면 됩니다.

```shell
subql init --starter PROJECT_NAME
```

SubQuery 프로젝트가 초기화되면 다음과 같은 특정 질문을 받게 됩니다.

- Git 저장소 (선택 사항): 이 SubQuery 프로젝트가 호스팅될 리포지토리에 대한 Git URL을 제공합니다(SubQuery Explorer에서 호스팅되는 경우).
- RPC 끝점 (필요시): 이 프로젝트에 기본적으로 사용될 실행 중인 RPC 끝점에 대한 wss URL을 제공합니다. 다양한 Polkadot 네트워크의 공용 엔드포인트에 빠르게 액세스하거나 [OnFinality](https://app.onfinality.io)를 사용하여 자체 전용 전용 노드를 생성하거나 기본 Polkadot 엔드포인트를 사용할 수도 있습니다.
- 작성자(필요시): 이 SubQuery 프로젝트의 소유자를 여기에 입력하십시오.
- 설명(선택 사항): 프로젝트에 포함된 데이터와 사용자가 수행할 수 있는 작업을 설명하는 짧은 단락을 제공할 수 있습니다.
- 버전(필요시): 사용자 정의 버전 번호를 입력하거나 기본값(1.0.0)을 사용합니다.
- 라이선스(필요시): 이 프로젝트에 대한 소프트웨어 라이선스를 제공하거나 기본값(`Apache-2.0`)을 수락합니다.

초기화 프로세스가 완료되면, 프로젝트 이름이 있는 폴더가 디렉터리 내에 생성된 것을 볼 수 있습니다. 이 디렉토리의 내용은 [디렉토리 구조](../create/introduction.md#directory-structure)에 나열된 것과 동일해야 합니다.

마지막으로, 프로젝트 디렉터리에서 다음 명령을 실행하여 새 프로젝트의 종속성을 설치합니다.

<CodeGroup> cd PROJECT_NAME # Yarn yarn install # NPM npm install 주로 다음 파일에서 작업하게 됩니다.:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

고유한 SubQuery를 작성하는 방법에 대한 자세한 내용은 프로젝트 만들기에서 설명서를 확인하세요.

### GraphQL 모델 생성

귀하의 SubQuery 프로젝트를 [인덱싱](../run/run.md)하려면 먼저 GraphQL 스키마 파일(`schema.graphql`)에 정의한 필수 GraphQL 모델을 생성해야 합니다. 프로젝트 디렉토리의 루트에서 이 명령을 실행하십시오.

<CodeGroup> # Yarn yarn codegen # NPM npm run-script codegen

## 프로젝트 빌드하기

로컬에서 호스팅되는 SubQuery 노드에서 SubQuery 프로젝트를 실행하려면 작업을 빌드해야 합니다.

프로젝트의 루트 디렉터리에서 빌드 명령을 실행합니다.

<CodeGroup> <CodeGroupItem title="YARN" active> ```쉘 원사 빌드 ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```배시 npm 실행 스크립트 빌드 ``` </CodeGroupItem> </CodeGroup>

## 스타터 프로젝트 실행 및 쿼리

새 프로젝트를 [SubQuery 프로젝트](https://project.subquery.network)에 빠르게 게시하고 [탐색기](https://explorer.subquery.network)를 사용하여 쿼리할 수 있지만, SubQuery 노드를 로컬로 실행하는 가장 쉬운 방법은 다음과 같은 경우 Docker 컨테이너에서 실행하는 것입니다. Docker가 아직 없는 경우 [docker.com](https://docs.docker.com/get-docker/)에서 설치할 수 있습니다.

[_이 단계를 건너뛰고 새 프로젝트를 SubQuery 프로젝트에 게시합니다._](../publish/publish.md)

### SubQuery 프로젝트 실행

SubQuery 노드가 실행되는 방식을 제어하는 모든 구성은 이 `docker-compose.yml` 파일에 정의되어 있습니다. 방금 초기화된 새 프로젝트의 경우 여기에서 아무 것도 변경할 필요가 없지만 [프로젝트 실행 섹션](../run/run.md)에서 파일 및 설정에 대한 자세한 내용을 읽을 수 있습니다.

프로젝트 디렉터리에서 다음 명령을 실행합니다:

```shell
docker-compose pull && docker-compose up
```

필요한 패키지([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query) 및 Postgres)를 처음으로 다운로드하는 데 시간이 걸릴 수 있지만, 곧 SubQuery노드가 실행 중인 것을 볼 수 있습니다.

### 프로젝트 쿼리

브라우저를 열고 [http://localhost:3000](http://localhost:3000)으로 이동합니다.

GraphQL 플레이그라운드가 탐색기에 표시되고 쿼리할 준비가 된 스키마가 표시되어야 합니다. 플레이그라운드의 오른쪽 상단에는 문서 추첨을 여는 _문서_ 버튼이 있습니다. 이 문서는 자동으로 생성되며 쿼리할 수 있는 엔터티와 메서드를 찾는 데 도움이 됩니다.

새로운 SubQuery 스타터 프로젝트의 경우, 다음 쿼리를 시도하여 작동 방식을 맛보거나 [GraphQL 쿼리 언어에 대해 자세히 알아볼 수 있습니다.](../query/graphql.md)

```graphql
{
  query {
    starterEntities(first: 10) {
      nodes {
        field1
        field2
        field3
      }
    }
  }
}
```

## 다음 단계

축하합니다. 이제 귀하는 샘플 데이터에 대한 GraphQL API 요청을 수락하는 로컬 실행 SubQuery 프로젝트가 있습니다. 다음 가이드에서는, 새 프로젝트를 [SubQuery 프로젝트](https://project.subquery.network)에 게시하고 [Explorer](https://explorer.subquery.network)를 사용하여 쿼리하는 방법을 보여줍니다.

[새 프로젝트를 SubQuery 프로젝트에 게시하세요.](../publish/publish.md)

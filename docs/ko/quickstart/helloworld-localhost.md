# Hello World (localhost + Docker)

SubQuery Hello World 빠른 시작에 오신 것을 환영합니다. 빠른 시작은 몇 가지 간단한 단계를 통해 Docker에서 기본 스타터 프로젝트를 실행하는 방법을 보여주는 것을 목표로 합니다.

## 학습 목표

이 빠른 시작이 끝나면 다음을 수행해야 합니다.

- 필요한 전제 조건을 이해
- 기본 공통 명령 이해
- localhost:3000으로 이동하여 플레이그라운드를 볼 수 있습니다.
- 간단한 쿼리를 실행하여 Polkadot 메인넷의 블록 높이를 가져옵니다.

## 대상자

이 가이드는 약간의 개발 경험이 있고 SubQuery에 대해 더 배우고자 하는 새로운 개발자를 대상으로 합니다.

## 비디오 가이드

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/j034cyUYb7k" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 전제 조건

다음이 필요합니다:

- 원사 또는 npm 패키지 관리자
- 서브쿼리 CLI(`@subql/cli`)
- Docker

터미널에서 다음 명령을 실행하여 이러한 전제 조건이 이미 있는지 확인할 수 있습니다.

```shell
yarn -v (or npm -v)
subql -v
docker -v
```

보다 숙달된 사용자의 경우 다음을 복사하여 붙여넣습니다.

```shell
echo -e "My yarn version is:" `yarn -v` "\nMy subql version is:" `subql -v`  "\nMy docker version is:" `docker -v`
```

이것은 다음을 반환해야 합니다: (npm 사용자의 경우 yarn을 npm으로 교체)

```shell
My yarn version is: 1.22.10
My subql version is: @subql/cli/0.9.3 darwin-x64 node-v16.3.0
My docker version is: Docker version 20.10.5, build 55c4c88
```

위의 내용이 나오면 올바른 길로 가고 있는 것입니다. 그렇지 않은 경우 다음 링크를 따라 설치하십시오.

- [yarn](https://classic.yarnpkg.com/en/docs/install/) or [npm](https://www.npmjs.com/get-npm)
- [SubQuery CLI](quickstart.md#install-the-subquery-cli)
- [Docker](https://docs.docker.com/get-docker/)

## 1. Step 1: Initialise project

SubQuery를 시작할 때 첫 번째 단계는 `subql init` 명령을 실행하는 것입니다. `subqlHelloWorld`라는 이름으로 시작 프로젝트를 초기화합시다. 오로지 작성자만이 필수라는 것을 기억하세요. 다른 모든 것은 아래에 비어 있습니다.

```shell
> subql init --starter subqlHelloWorld
Git repository:
RPC endpoint [wss://polkadot.api.onfinality.io/public-ws]:
Authors: sa
Description:
Version: [1.0.0]:
License: [Apache-2.0]:
Init the starter package... subqlHelloWorld is ready

```

이 새 디렉토리로 변경하는 것을 잊지 마십시오.

```shell
cd subqlHelloWorld
```

## 2. Step 2: Install dependencies

이제 다양한 종속성을 설치하기 위해 원사 또는 노드 설치를 수행합니다.

<CodeGroup> # Yarn yarn install # NPM npm install

```shell
> yarn install
yarn install v1.22.10
info No lockfile found.
[1/4] 🔍  Resolving packages...
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
[4/4] 🔨  Building fresh packages...
success Saved lockfile.
✨  Done in 31.84s.
```

## 3. Step 3: Generate code

이제 `yarn codegen`을 실행하여 GraphQL 스키마에서 Typescript를 생성합니다.

<CodeGroup> # Yarn yarn codegen # NPM npm run-script codegen

```shell
> yarn codegen
yarn run v1.22.10
$ ./node_modules/.bin/subql codegen
===============================
---------Subql Codegen---------
===============================
* Schema StarterEntity generated !
* Models index generated !
* Types index generated !
✨  Done in 1.02s.
```

**경고** 스키마 파일이 변경되면 `yarn codegen`을 다시 실행하여 유형 디렉토리를 재생성하는 것을 잊지 마십시오.

## 4. Step 4: Build code

다음 단계는 `yarn build`로 코드를 빌드하는 것입니다.

<CodeGroup> # Yarn yarn build # NPM npm run-script build

```shell
> yarn build
yarn run v1.22.10
$ tsc -b
✨  Done in 5.68s.
```

## 5. Run Docker

Docker를 사용하면 필요한 모든 인프라가 Docker 이미지 내에서 제공될 수 있기 때문에 이 예제를 매우 빠르게 실행할 수 있습니다. `docker-compose pull && docker-compose up`을 실행합니다.

이것은 결국 불러온 블록들 속으로 모든 것을 걷어차게 될 것입니다.

```shell
> #SNIPPET
subquery-node_1   | 2021-06-05T22:20:31.450Z <subql-node> INFO node started
subquery-node_1   | 2021-06-05T22:20:35.134Z <fetch> INFO fetch block [1, 100]
subqlhelloworld_graphql-engine_1 exited with code 0
subquery-node_1   | 2021-06-05T22:20:38.412Z <fetch> INFO fetch block [101, 200]
graphql-engine_1  | 2021-06-05T22:20:39.353Z <nestjs> INFO Starting Nest application...
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO AppModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO ConfigureModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.383Z <nestjs> INFO GraphqlModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.809Z <nestjs> INFO Nest application successfully started
subquery-node_1   | 2021-06-05T22:20:41.122Z <fetch> INFO fetch block [201, 300]
graphql-engine_1  | 2021-06-05T22:20:43.244Z <express> INFO request completed

```

## 6. Browse playground

http://localhost:3000/으로 이동하여 화면 왼쪽에 아래 쿼리를 붙여넣고 재생 버튼을 누릅니다.

```
{
 query{
   starterEntities(last:10, orderBy:FIELD1_ASC ){
     nodes{
       field1
     }
   }
 }
}

```

localhost의 SubQuery 플레이그라운드.

![playground localhost](/assets/img/subql_playground.png)

놀이터의 블록 수는 터미널의 블록 수(기술적으로 블록 높이)와도 일치해야 합니다.

## 요약

이 빠른 시작에서는 Docker 환경 내에서 스타터 프로젝트를 시작하고 실행하는 기본 단계를 시연한 다음 localhost:3000으로 이동하고 메인넷 Polkadot 네트워크의 블록 번호를 반환하는 쿼리를 실행했습니다.

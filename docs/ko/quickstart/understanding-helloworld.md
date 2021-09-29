# Hello World 설명

[Hello World 빠른 시작 가이드](helloworld-localhost.md)에서 우리는 몇 가지 간단한 명령을 실행했고 매우 빠르게 예제를 실행했습니다. 이를 통해 모든 전제 조건이 준비되었는지 확인하고 로컬 플레이그라운드를 사용하여 간단한 쿼리를 만들어 SubQuery에서 첫 번째 데이터를 가져올 수 있습니다. 여기에서 모든 명령이 의미하는 바를 자세히 살펴보겠습니다.

## subql 초기화

우리가 실행한 첫 번째 명령은 `subql init --starter subqlHelloWorld`였습니다.

이것은 무거운 작업을 수행하고 많은 파일을 생성합니다. [공식 문서](quickstart.md#configure-and-build-the-starter-project)에 명시된 바와 같이 주로 다음 파일에 대해 작업하게 됩니다.

- 매니페스트 인 `project.yaml`
- GraphQL 스키마 `schema.graphql`
- 매핑 기능 `src/mappings/` 디렉토리

![key subql files](/assets/img/main_subql_files.png)

이 파일은 우리가 하는 모든 일의 핵심입니다. 따라서 다른 기사에서 이러한 파일에 더 많은 시간을 할애할 것입니다. 하지만 지금은 스키마에 사용자가 SubQuery API에서 요청할 수 있는 데이터에 대한 설명, "구성" 유형 매개변수가 포함된 프로젝트 yaml 파일, 물론 데이터를 변환하는 함수가 포함된 typescript가 포함된 mappingHandlers에 대한 설명이 포함되어 있다는 점만 알아두십시오.

## yarn 설치

다음 작업은 `yarn install`이었습니다. `npm install`도 사용할 수 있습니다.

> 짧은 역사 수업. Node Package Manager 또는 npm은 2010년에 처음 출시되었으며 JavaScript 개발자들 사이에서 엄청나게 인기 있는 패키지 관리자입니다. 시스템에 Node.js를 설치할 때마다 자동으로 설치되는 기본 패키지입니다. Yarn은 (당시) npm으로 작업할 때의 일부 성능 및 보안 단점을 해결하기 위해 2016년 Facebook에서 처음 출시했습니다.

Yarn 이 하는 일은 `package.json` 파일을 보고 다양한 다른 종속성을 다운로드하는 것입니다. `package.json` 파일을 보면 종속성이 별로 없어 보이지만 명령어를 실행하면 18,983개의 파일이 추가된 것을 알 수 있습니다. 이는 각 종속성에도 고유한 종속성이 있기 때문입니다.

![key subql files](/assets/img/dependencies.png)

## yarn 코드젠

그런 다음 `yarn codegen` 또는 `npm run-script codegen`을 실행했습니다. 이것이 하는 일은 GraphQL 스키마(`schema.graphql`에 있음)를 가져오고 관련 typescript 모델 파일을 생성하는 것입니다(따라서 출력 파일의 확장자는 .ts입니다). 이렇게 생성된 파일을 변경해서는 안 되며 소스 `schema.graphql` 파일만 변경하십시오.

![key subql files](/assets/img/typescript.png)

## yarn 빌드

그런 다음 `yarn build` 또는 `npm run-script build`가 실행되었습니다. 이것은 노련한 프로그래머에게 친숙할 것입니다. 배포를 준비하는 코드 최적화와 같은 작업을 수행하는 배포 폴더를 만듭니다.

![key subql files](/assets/img/distribution_folder.png)

## 도커-작성

마지막 단계는 결합된 docker 명령 `docker-compose pull && docker-compose up`(별도로 실행할 수도 있음). `pull` 명령은 Docker Hub에서 필요한 모든 이미지를 가져오고 `up` 명령은 컨테이너를 시작합니다.

```shell
> docker-compose pull
Pulling postgres        ... done
Pulling subquery-node   ... done
Pulling graphql-engine  ... done
```

컨테이너가 시작되면 터미널이 노드와 GraphQL 엔진의 상태를 보여주는 많은 텍스트를 뱉어내는 것을 볼 수 있습니다. 다음을 볼 때입니다.

```
subquery-node_1   | 2021-06-06T02:04:25.490Z <fetch> INFO fetch block [1, 100]
```

subQuery 노드가 동기화를 시작했다는 것을 알고 있습니다.

## 요약

은밀히 일어나는 일에 대한 통찰력을 얻었으므로 이제 여기서부터 어디로 가야 합니까? 자신이 있다면 [프로젝트 생성](../create/introduction.md) 방법과 세 가지 주요 파일에 대해 자세히 알아볼 수 있습니다. 매니페스트 파일, GraphQL 스키마 및 매핑 파일.

그렇지 않으면 SubQuery의 호스팅된 인프라에서 이 Hello World 예제를 실행하는 방법을 살펴보는 자습서 섹션을 계속 진행하고 시작 블록을 수정하는 방법을 살펴보고 즉시 사용 가능한 실행을 통해 SubQuery 프로젝트를 실행하는 방법에 대해 자세히 알아보겠습니다. 및 오픈 소스 프로젝트.

# Hello World (SubQuery 호스팅)

이 빠른 시작의 목적은 몇 가지 간단한 단계를 통해 SubQuery 프로젝트(우리의 관리 서비스)에서 기본 스타터 프로젝트를 실행하는 방법을 보여주는 것입니다.

간단한 스타터 프로젝트(그리고 지금까지 배운 모든 것)를 사용하지만 Docker 내에서 로컬로 실행하는 대신 SubQuery의 관리 호스팅 인프라를 활용합니다. 즉, 우리는 SubQuery가 프로덕션 인프라를 실행하고 관리하는 모든 무거운 작업을 수행하도록 합니다.

## 학습 목표

빠른 시작이 끝나면, 다음을 수행해야 합니다.

- 필요한 전제 조건을 이해
- [SubQuery 프로젝트](https://project.subquery.network/)에서 프로젝트를 호스팅할 수 있습니다.
- 플레이그라운드를 사용하여 Polkadot 메인넷의 블록 높이를 가져오는 간단한 쿼리를 실행합니다.
- cURL을 사용하여 Polkadot 메인넷의 블록 높이를 가져오기 위해 간단한 GET 쿼리를 실행합니다.

## 대상자

이 가이드는 약간의 개발 경험이 있고 SubQuery에 대해 더 배우고자 하는 새로운 개발자를 대상으로 합니다.

## 비디오 가이드

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 전제조건

다음이 필요할 것입니다:

- gitHub 계정

## 1. Step 1: Create your project

subql_hellowworld라는 프로젝트를 만들고 가장 선호하는 패키지 관리자로 필수 설치, codegen 및 빌드를 실행해 보겠습니다.

```shell
> subql init --starter subqlHelloWorld
yarn install
yarn codegen
yarn build
```

그러나 docker 명령을 실행하지 마십시오.

## 2. Step 2: Create a GitHub repo

GitHub에서 새 공용 저장소를 만듭니다. 이름을 부여하고 공개 여부를 설정합니다. 여기에서는 모든 것이 현재 기본값으로 유지됩니다.

![create github repo](/assets/img/github_create_new_repo.png)

GitHub URL을 기록해 둡니다. SubQuery가 액세스하려면 이 URL이 공개되어야 합니다.

![create github repo](/assets/img/github_repo_url.png)

## 3. Step 3: Push to GitHub

프로젝트 디렉토리로 돌아가 git 디렉토리로 초기화합니다. 그렇지 않으면 "치명적인: git 저장소(또는 상위 디렉토리)가 아님: .git" 오류가 발생할 수 있습니다.

```shell
git init
```

그런 다음 다음 명령을 사용하여 원격 저장소를 추가합니다.

```shell
git remote add origin https://github.com/seandotau/subqlHelloWorld.git
```

이것은 기본적으로 원격 저장소를 "https://github.com/seandotau/subqlHelloWorld.git"으로 설정하고 GitHub의 원격 저장소에 대한 표준 명명법인 "origin"이라는 이름을 부여합니다.

다음으로 다음 명령을 사용하여 저장소에 코드를 추가합니다.

```shell
> git add .
> git commit -m "First commit"
[master (root-commit) a999d88] First commit
10 files changed, 3512 insertions(+)
create mode 100644 .gitignore
create mode 100644 README.md
create mode 100644 docker-compose.yml
create mode 100644 package.json
create mode 100644 project.yaml
create mode 100644 schema.graphql
create mode 100644 src/index.ts
create mode 100644 src/mappings/mappingHandlers.ts
create mode 100644 tsconfig.json
create mode 100644 yarn.lock
> git push origin master
Enumerating objects: 14, done.
Counting objects: 100% (14/14), done.
Delta compression using up to 12 threads
Compressing objects: 100% (13/13), done.
Writing objects: 100% (14/14), 59.35 KiB | 8.48 MiB/s, done.
Total 14 (delta 0), reused 0 (delta 0)
To https://github.com/seandotau/subqlHelloWorld.git
 * [new branch]      master -> master

```

Push 명령은 "내 코드를 내 마스터 로컬 저장소에서 원본 저장소로 푸시하세요"를 의미합니다 GitHub를 새로 고치면 GitHub의 모든 코드가 표시됩니다.

![First commit](/assets/img/first_commit.png)

이제 GitHub에 코드를 가져왔으므로 SubQuery 프로젝트에서 호스트하는 방법을 살펴보겠습니다.

## 4. Create your project

https://project.subquery.network로 이동하여 GitHub 계정으로 로그인합니다.

![Welcome to SubQuery Projects](/assets/img/welcome_to_subquery_projects.png)

그런 다음 새 프로젝트를 만들고,

![Welcome to SubQuery Projects](/assets/img/subquery_create_project.png)

그리고 적절한 세부 정보로 다양한 필드를 채우십시오.

- **GitHub account:**: GitHub 계정이 두 개 이상인 경우, 이 프로젝트가 생성될 계정을 선택합니다. GitHub 조직 계정에서 생성된 프로젝트는 해당 조직의 구성원 간에 공유됩니다.
- **Project Name:**여기에 프로젝트 이름을 지정합니다.
- **Subtitle:** 프로젝트에 자막을 제공합니다.
- **Description:**SubQuery 프로젝트가 하는 일을 설명하십시오.
- **GitHub Repository URL:**SubQuery 프로젝트가 포함된 공용 저장소에 대한 유효한 GitHub URL이어야 합니다. 이 schema.graphql 파일은 디렉토리의 루트에 있어야 합니다.
- **Hide project:**선택하면, 공개 SubQuery 탐색기에서 프로젝트를 숨깁니다. 커뮤니티와 SubQuery를 공유하려면 이 항목을 선택하지 않은 상태로 유지하십시오!

![Create SubQuery parameters](/assets/img/create_subquery_project_parameters.png)

만들기를 클릭하면, 대시보드로 이동합니다.

![SubQuery Project dashboard](/assets/img/subquery_project_dashboard.png)

대시보드에는 사용 중인 네트워크, 실행 중인 소스 코드의 GitHub 저장소 URL, 생성 및 마지막 업데이트 시간, 특히 배포 세부 정보와 같은 유용한 정보가 많이 포함되어 있습니다.

## 5. Step 5: Deploy your project

이제 SubQuery 프로젝트 내에서 프로젝트를 만들고 표시 동작을 설정했으므로 다음 단계는 프로젝트를 작동하도록 배포하는 것입니다. 버전을 배포하면 새로운 SubQuery 인덱싱 작업이 시작되고 필요한 쿼리 서비스가 GraphQL 요청 수락을 시작하도록 설정됩니다. 여기에서 기존 프로젝트에 새 버전을 배포할 수도 있습니다.

프로덕션 슬롯 또는 스테이징 슬롯과 같은 다양한 환경에 배포하도록 선택할 수 있습니다. 여기에서 프로덕션 슬롯에 배포합니다. "배포" 버튼을 클릭하면 다음 파일이 있는 화면이 나타납니다.

![Deploy to production slot](/assets/img/deploy_production_slot.png)

- **Commit Hash of new Version:**GitHub에서 배포하려는 SubQuery 프로젝트 코드베이스의 올바른 커밋을 선택합니다.
- **Indexer Version:**이 SubQuery를 실행하려는 SubQuery의 노드 서비스 버전입니다. [@subql/node](https://www.npmjs.com/package/@subql/node) 참조
- **Query Version:** 이 SubQuery를 실행하려는 SubQuery의 쿼리 서비스 버전입니다. [@subql/query](https://www.npmjs.com/package/@subql/query) 참조

커밋이 하나만 있기 때문에 드롭다운에 하나의 옵션만 있습니다. 또한 최신 버전의 인덱서 및 쿼리 버전으로 작업하여 기본값을 수락한 다음 "업데이트 배포"를 클릭합니다.

그러면 "처리 중" 상태의 배포가 표시됩니다. 여기에서 코드가 SubQuery의 관리 인프라에 배포되고 있습니다. 기본적으로 서버는 요청 시 가동되고 공급됩니다. 이것은 몇 분 정도 걸릴 것이므로 커피를 마실 시간입니다!

![Deployment processing](/assets/img/deployment_processing.png)

이제 배포가 실행 중입니다.

![Deployment running](/assets/img/deployment_running.png)

## 6. Step 6: Testing your project

프로젝트를 테스트하려면 3개의 줄임표를 클릭하고 "SubQuery Explorer에서 보기"를 선택합니다.

![View Subquery project](/assets/img/view_on_subquery.png)

이렇게 하면 재생 버튼을 클릭하고 쿼리 결과를 볼 수 있는 친숙한 "Playground"로 이동합니다.

![Subquery playground](/assets/img/subquery_playground.png)

## 7. Step 7: Bonus step

우리 중 똑똑한 사람들을 위해, 학습 목표에서 마지막 요점은 간단한 GET 쿼리를 실행하는 것이었음을 기억할 것입니다. 이렇게 하려면, 배포 세부 정보에 표시된 "쿼리 끝점"을 가져와야 합니다.

![Query endpoing](/assets/img/query_endpoint.png)

그런 다음 [Postman](https://www.postman.com/) 또는 [Mockoon](https://mockoon.com/)과 같은 자주 사용하는 클라이언트를 사용하거나 터미널의 cURL을 통해 이 끝점에 GET 요청을 보낼 수 있습니다. 간단하게 cURL이 아래에 표시됩니다.

실행할 curl 명령은 다음과 같습니다.

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

다음과 같은 결과가 나옵니다.

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

이 JSON 응답을 사용하고 구문 분석할 프런트 엔드 코드가 있을 수 있으므로 가독성은 여기에서 문제가 되지 않습니다.

## 요약

이 SubQuery에서 호스팅하는 빠른 시작에서 우리는 Subql 프로젝트를 가지고 모든 인프라가 귀하의 편의를 위해 제공되는 [SubQuery 프로젝트](https://project.subquery.network)에 배포하는 것이 얼마나 빠르고 쉬운지 보여주었습니다. 다양한 쿼리를 실행할 수 있는 내장형 플레이그라운드와 코드를 통합할 수 있는 API 엔드포인트가 있습니다.

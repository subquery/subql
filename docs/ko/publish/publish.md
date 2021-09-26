# Publish your SubQuery Project

## SubQuery를 사용하여 프로젝트를 호스팅하는 이점
- SubQuery 프로젝트를 고성능, 확장성, 관리성 높은 공공서비스로 실행합니다.
- 이 서비스는 커뮤니티에 무료로 제공되고 있어요!
- 프로젝트를 공개하고 [SubQuery Explorer](https://explorer.subquery.network) 에 표시하며 전세계 누구라도 프로젝트를 참조할 수 있습니다.
- 저희는 깃허브과 통합이 되어 있으므로 깃허브 단체에서 누구나 공유단체 프로젝트를 볼 수 있습니다.

## 최초 프로젝트 생성

#### SubQuery 프로젝트 로그인

시작하기 전에 공개 깃허브 저장소에서 SubQuery 프로젝트가 온라인으로 되어 있는지 확인하세요. `schema.graphql` 파일은, 디렉토리의 루트에 있을 필요가 있습니다.

첫 번째 프로젝트를 생성하려면 [project.subquery.network](https://project.subquery.network)로 이동합니다. 로그인을 하려면 깃허브 계정으로 인증해야 합니다.

최초 로그인 후 SubQuery를 허용하도록 요청됩니다. 저희는 당신의 계정을 식별하기 위해 당신의 이메일 주소가 필요하며, 다른 이유로 당신의 깃허브 계정의 다른 데이터는 사용하지 않습니다. 이 단계에서는 깃허브 단체 계정에 대한 접근을 요청하거나 허용할 수도 있으며, 개인 계정이 아닌 깃허브 단체 아래에 SubQuery 프로젝트를 게시할 수 있습니다.

![깃허브 계정 승인 취소](/assets/img/project_auth_request.png)

SubQuery Projects는 SubQuery 플랫폼에 업로드된 모든 호스트 프로젝트를 관리하는 곳입니다. 이 어플리케이션에서는 모든 프로젝트를 생성, 삭제, 업그레이드 할 수 있습니다.

![프로젝트 로그인](/assets/img/projects-dashboard.png)

깃허브 단체 계정이 연결되어 있으면 머리글의 스위치를 사용하여 개인 계정과 깃허브 단체 계정을 변경할 수 있습니다. 깃허브 단체 계정으로 생성된 프로젝트는 해당 깃허브 단체 구성원간에 공유됩니다. 깃허브 단체 계정을 접속하려면 [follow the steps here](#add-github-organization-account-to-subquery-projects)를 따르세요.

![깃허브 계정 간 전환](/assets/img/projects-account-switcher.png)

#### 최초 프로젝트 생성

먼저 "프로젝트 만들기"를 클릭합니다. 새 프로젝트 양식으로 이동합니다. 다음의 항목을 입력해 주세요(장래 변경할 수 있습니다):
- **GitHub account:** 여러 개의 깃허브 계정이 있는 경우 이 프로젝트를 생성할 계정을 선택합니다. 깃허브 단체 계정으로 생성된 프로젝트는 단체내 구성원간에 공유됩니다.
- **이름**
- **부제**
- **설명**
- **GitHub Repository URL:** SubQuery 프로젝트가 있는 퍼블릭 저장소에 대한 유효한 깃허브 URL이어야 합니다. `schema.graphql` 파일은, 디렉토리의 루트에 있을 필요가 있습니다([learn more about the directory structure](../create/introduction.md#directory-structure)).
- **Hide project:** 선택하면 퍼블릭 SubQuery 탐색기에서 프로젝트가 숨겨집니다. SubQuery를 커뮤니티와 공유할 경우 이 항목을 삭제합니다. ![최초 프로젝트 생성](/assets/img/projects-create.png)

프로젝트를 생성하면 SubQuery Project 목록에 프로젝트가 나타납니다. *거의 다 왔어요! We just need to deploy a new version of it.

![전개 없이 생성된 프로젝트](/assets/img/projects-no-deployment.png)

#### 첫 번째 버전 전개

프로젝트를 생성하면 프로젝트의 표시 동작이 설정되지만 실행 전에 버전을 전개해야 합니다. 버전을 배포하면 새로운 SubQuery 인덱스 작업이 시작되고 GraphQL 요구 수용을 시작하기 위해 필요한 Query 서비스가 설정됩니다. 여기서는 기존 프로젝트에 새로운 버전을 배포할 수도 있습니다.

새로운 프로젝트에서는 새로운 버전 배포 버튼이 나타납니다. 이를 클릭하고 전개에 필요한 정보를 입력합니다:
- **Commit Hash of new Version:** 깃허브에서, 전개하는 SubQuery 프로젝트 코드 베이스의 버전의 완전 커밋 해시를 복사 합니다.
- **Indexer Version:** 이 SubQuery를 실행하는 SubQuery의 노드 서비스 버전입니다. [`@subql/node`](https://www.npmjs.com/package/@subql/node)를 보세요
- **Query Version:** 이 SubQuery를 실행하는 SubQuery query 서비스 버전입니다. [`@subql/query`](https://www.npmjs.com/package/@subql/query)를 보세요

![첫 번째 프로젝트 전개](https://static.subquery.network/media/projects/projects-first-deployment.png)

배포에 성공하면 인덱스가 동작을 개시하여 현재 체인의 인덱스 작성 진행 상황을 다시 보고할 수 있습니다. 이 과정은 100%까지 시간이 걸릴 수 있습니다.

## 다음 단계 - 프로젝트연결
배포가 성공적으로 완료되고 노드가 체인에서 데이터를 인덱스화하면 표시된 GraphQL Query 엔드 포인트를 통해 프로젝트에 접속할 수 있습니다.

![프로젝트 전개와 동기화](/assets/img/projects-deploy-sync.png)

프로젝트 제목 옆에 있는 3개의 점을 클릭하여 SubQuery Explorer로 표시할 수도 있습니다. 브라우저 내 플레이그라운드를 사용하여 시작할 수 있습니다 - [read more about how to user our Explorer here](../query/query.md) 이쪽을 참조해 주세요.

![SubQuery 탐색기 프로젝트](/assets/img/projects-explorer.png)

## SubQuery 프로젝트에 깃허브 단체 계정 추가

개인 깃허브 계정이 아닌 깃허브 단체 계정의 이름으로 SubQuery 프로젝트를 공개하는 것이 일반적입니다. 언제든지 계정 스위처를 사용하여 [SubQuery Projects](https://project.subquery.network)에서 현재 선택된 계정을 변경할 수 있습니다.

![Git Hub 계정 간 전환](/assets/img/projects-account-switcher.png)

스위처에 깃허브 단체 계정이 나타나지 않으면 깃허브 단체의 SubQuery 접근을 허용하거나 관리자에게 요청해야 합니다. 그러기 위해서는 먼저 깃허브 계정에서 SubQuery 신청서에 대한 권한을 취소해야 합니다. 이를 수행하려면 깃허브에서 계정 설정에 로그인하고 애플리케이션으로 이동하여 권한부여된 OAuth 앱 탭에서, SubQuery를 비활성화 합니다 - [you can follow the exact steps here](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). ** 걱정하지 마세요, 이는 SubQuery 프로젝트는 삭제되지 않고 데이터도 잃지 않습니다. **

![Git Hub 계정 접근을 비활성화합니다.](/assets/img/project_auth_revoke.png)

접근을 취소하면 [SubQuery Projects](https://project.subquery.network) 에서 로그아웃 하고 다시 로그인 합니다. *Authorize SubQuery* 이라는 제목의 페이지로 리다이렉트 되어 깃허브 단체 계정에 대한 SubQuery 접근을 요구하거나 허용할 수 있습니다. 어드민 권한이 없는 경우 관리자에게 요청하여 이너블로 만들어야 합니다.

![Git Hub 계정 승인 취소](/assets/img/project_auth_request.png)

이 요구가 관리자에 의해 승인되면(또는 직접 승인할 수 있는 경우) 계정전환기에 올바른 깃허브 단체 계정이 표시됩니다.
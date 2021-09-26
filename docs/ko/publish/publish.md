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

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

SubQuery Projects는 SubQuery 플랫폼에 업로드된 모든 호스트 프로젝트를 관리하는 곳입니다. 이 어플리케이션에서는 모든 프로젝트를 생성, 삭제, 업그레이드 할 수 있습니다.

![Projects Login](/assets/img/projects-dashboard.png)

깃허브 단체 계정이 연결되어 있으면 머리글의 스위치를 사용하여 개인 계정과 깃허브 단체 계정을 변경할 수 있습니다. 깃허브 단체 계정으로 생성된 프로젝트는 해당 깃허브 단체 구성원간에 공유됩니다. 깃허브 단체 계정을 접속하려면 [follow the steps here](#add-github-organization-account-to-subquery-projects)를 따르세요.

![Switch between GitHub accounts](/assets/img/projects-account-switcher.png)

#### 최초 프로젝트 생성

먼저 "프로젝트 만들기"를 클릭합니다. 새 프로젝트 양식으로 이동합니다. 다음의 항목을 입력해 주세요(장래 변경할 수 있습니다):
- **GitHub account:** 여러 개의 깃허브 계정이 있는 경우 이 프로젝트를 생성할 계정을 선택합니다. 깃허브 단체 계정으로 생성된 프로젝트는 단체내 구성원간에 공유됩니다.
- **이름**
- **부제**
- **설명**
- **GitHub Repository URL:** SubQuery 프로젝트가 있는 퍼블릭 저장소에 대한 유효한 깃허브 URL이어야 합니다. `schema.graphql` 파일은, 디렉토리의 루트에 있을 필요가 있습니다([learn more about the directory structure](../create/introduction.md#directory-structure)).
- **Hide project:** 선택하면 퍼블릭 SubQuery 탐색기에서 프로젝트가 숨겨집니다. SubQuery를 커뮤니티와 공유할 경우 이 항목을 삭제합니다. ![Create your first Project](/assets/img/projects-create.png)

프로젝트를 생성하면 SubQuery Project 목록에 프로젝트가 나타납니다. *We're almost there! We just need to deploy a new version of it. </p>

![Created Project with no deployment](/assets/img/projects-no-deployment.png)

#### Deploy your first Version

While creating a project will setup the display behaviour of the project, you must deploy a version of it before it becomes operational. Deploying a version triggers a new SubQuery indexing operation to start, and sets up the required query service to start accepting GraphQL requests. You can also deploy new versions to existing projects here.

With your new project, you'll see a Deploy New Version button. Click this, and fill in the required information about the deployment:
- **Commit Hash of new Version:** From GitHub, copy the full commit hash of the version of your SubQuery project codebase that you want deployed
- **Indexer Version:** This is the version of SubQuery's node service that you want to run this SubQuery on. See [`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **Query Version:** This is the version of SubQuery's query service that you want to run this SubQuery on. See [`@subql/query`](https://www.npmjs.com/package/@subql/query)

![Deploy your first Project](https://static.subquery.network/media/projects/projects-first-deployment.png)

If deployed successfully, you'll see the indexer start working and report back progress on indexing the current chain. This process may take time until it reaches 100%.

## Next Steps - Connect to your Project
Once your deployment has succesfully completed and our nodes have indexed your data from the chain, you'll be able to connect to your project via the displayed GraphQL Query endpoint.

![Project being deployed and synced](/assets/img/projects-deploy-sync.png)

Alternatively, you can click on the three dots next to the title of your project, and view it on SubQuery Explorer. There you can use the in-browser playground to get started - [read more about how to user our Explorer here](../query/query.md).

![Projects in SubQuery Explorer](/assets/img/projects-explorer.png)

## Add GitHub Organization Account to SubQuery Projects

It is common to publish your SubQuery project under the name of your GitHub Organization account rather than your personal GitHub account. At any point your can change your currently selected account on [SubQuery Projects](https://project.subquery.network) using the account switcher.

![Switch between GitHub accounts](/assets/img/projects-account-switcher.png)

If you can't see your GitHub Organization account listed in the switcher, the you may need to grant access to SubQuery for your GitHub Organization (or request it from an administrator). To do this, you first need to revoke permissions from your GitHub account to the SubQuery Application. To do this, login to your account settings in GitHub, go to Applications, and under the Authorized OAuth Apps tab, revoke SubQuery - [you can follow the exact steps here](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). **Don't worry, this will not delete your SubQuery project and you will not lose any data.**

![Revoke access to GitHub account](/assets/img/project_auth_revoke.png)

Once you have revoked access, log out of [SubQuery Projects](https://project.subquery.network) and log back in again. You should be redirected to a page titled *Authorize SubQuery* where you can request or grant SubQuery access to your GitHub Organization account. If you don't have admin permissions, you must make a request for an adminstrator to enable this for you.

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

Once this request has been approved by your administrator (or if are able to grant it youself), you will see the correct GitHub Organization account in the account switcher.
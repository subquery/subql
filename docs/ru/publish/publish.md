# Опубликовать ваш проект SubQuery

## Преимущества хостинга вашего проекта с SubQuery
- Мы будем запускать ваши проекты SubQuery для вас в высокопроизводительной, масштабируемой и управляемой общедоступной службе
- Эта услуга предоставляется сообществу бесплатно!
- Вы можете сделать свои проекты общедоступными, чтобы они были перечислены в [ SubQuery Explorer ](https://explorer.subquery.network), и любой желающий мог их просматривать
- Мы интегрированы с GitHub, поэтому любой в вашей организации GitHub сможет просматривать общие проекты организации

## Создайте свой первый проект

#### Login to SubQuery Projects

Перед началом убедитесь, что ваш проект SubQuery находится в общедоступном репозитории GitHub. Файл `schema.graphql` должен быть в корне вашей директории.

Чтобы создать свой первый проект, перейдите на [project.subquery.network](https://project.subquery.network). Вам нужно авторизоваться с помощью вашей учетной записи GitHub, чтобы войти.

При первом входе вам будет предложено авторизовать SubQuery. Нам нужен только ваш адрес электронной почты, чтобы идентифицировать вашу учётную запись, и по другим причинам мы не используем никаких других данных из вашей учетной записи GitHub. На этом этапе вы также можете запросить или предоставить доступ к своей учетной записи GitHub Organization, чтобы вы могли публиковать проекты SubQuery в своей организации GitHub вместо своей личной учетной записи.

![Отозвать одобрение учетной записи GitHub](/assets/img/project_auth_request.png)

SubQuery Projects - это место, где вы управляете всеми размещенными проектами, загруженными на платформу SubQuery. Вы можете создавать, удалять и даже обновлять проекты всех из этого приложения.

![Логин Проектов](https://static.subquery.network/media/projects/projects-dashboard.png)

Если у вас есть учетные записи организации GitHub, можно использовать переключатель в заголовке для изменения между вашим персональным аккаунтом и вашей учетной записью организации GitHub. Projects created in a GitHub Organization account are shared between members in that GitHub Organization. To connect your GitHub Organization account, you can [follow the steps here](#add-github-organization-account-to-subquery-projects).

![Switch between GitHub accounts](https://static.subquery.network/media/projects/projects-account-switcher.png)

#### Create your First Project

Let's start by clicking on "Create Project". You'll be taken to the New Project form. Please enter the following (you can change this in the future):
- **GitHub account:** If you have more than one GitHub account, select which account this project will be created under. Projects created in a GitHub organisation account are shared between members in that organisation.
- **Name**
- **Subtitle**
- **Description**
- **GitHub Repository URL:** This must be a valid GitHub URL to a public repository that has your SubQuery project. The `schema.graphql` file must be in the root of your directory ([learn more about the directory structure](../create/introduction.md#directory-structure)).
- **Hide project:** If selected, this will hide the project from the public SubQuery explorer. Keep this unselected if you want to share your SubQuery with the community! ![Create your first Project](https://static.subquery.network/media/projects/projects-create.png)

Create your project and you'll see it on your SubQuery Project's list. *We're almost there! We just need to deploy a new version of it. * ![Created Project with no deployment](https://static.subquery.network/media/projects/projects-no-deployment.png)

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

![Project being deployed and synced](https://static.subquery.network/media/projects/projects-deploy-sync.png)

Alternatively, you can click on the three dots next to the title of your project, and view it on SubQuery Explorer. There you can use the in-browser playground to get started - [read more about how to user our Explorer here](../query/query.md).

![Projects in SubQuery Explorer](https://static.subquery.network/media/projects/projects-explorer.png)

## Add GitHub Organization Account to SubQuery Projects

It is common to publish your SubQuery project under the name of your GitHub Organization account rather than your personal GitHub account. At any point your can change your currently selected account on [SubQuery Projects](https://project.subquery.network) using the account switcher.

![Switch between GitHub accounts](https://static.subquery.network/media/projects/projects-account-switcher.png)

If you can't see your GitHub Organization account listed in the switcher, the you may need to grant access to SubQuery for your GitHub Organization (or request it from an administrator). To do this, you first need to revoke permissions from your GitHub account to the SubQuery Application. To do this, login to your account settings in GitHub, go to Applications, and under the Authorized OAuth Apps tab, revoke SubQuery - [you can follow the exact steps here](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). **Don't worry, this will not delete your SubQuery project and you will not lose any data.**

![Revoke access to GitHub account](/assets/img/project_auth_revoke.png)

Once you have revoked access, log out of [SubQuery Projects](https://project.subquery.network) and log back in again. You should be redirected to a page titled *Authorize SubQuery* where you can request or grant SubQuery access to your GitHub Organization account. If you don't have admin permissions, you must make a request for an adminstrator to enable this for you.

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

Once this request has been approved by your administrator (or if are able to grant it youself), you will see the correct GitHub Organization account in the account switcher.
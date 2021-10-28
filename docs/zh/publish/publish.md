# 发布您的 SubQuery 项目

## 使用 SubQuery 托管您的项目有哪些优势
- 我们将以高性能、可扩展和管理的公共服务来管理您的 SubQuery 项目
- 此服务正在免费提供给社区！
- 你可以公开你的项目，以便他们被列入 [SubQuery Explorer](https://explorer.subquery.network) 中，世界各地的任何人都可以查看这些项目
- 我们已经与 GitHub 集成，因此您的 GitHub 组织中的任何人都可以查看共享的组织项目

## 创建您的第一个项目。

#### 登录到 SubQuery 项目

在启动前，请确保您的 SubQuery 项目在 GitHub 公开存储库中在线。 `schema.graphql` 文件必须在您的目录的根目录中。

要创建您的第一个项目，头部为 [project.subquery.network](https://project.subquery.network)。 您需要使用您的 GitHub 帐户进行身份验证才能登录。

首次登录时，您将被要求授权 SubQuery。 我们只需要您的电子邮件地址来识别您的帐户，我们不会出于任何其他原因使用您的GitHub 帐户的任何其他数据。 在这一步骤中， 您也可以请求或授予您的 GitHub 组织帐户访问权限，以便您可以在您的 GitHub 组织下发布SubQuery 项目而不是您的个人帐户。

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

SubQuery 项目是您管理上传到SubQuery平台的所有托管项目的地方。 您可以从此应用程序创建、删除甚至升级项目。

![Projects Login](/assets/img/projects-dashboard.png)

如果您已连接到GitHub 组织帐户， 您可以使用页眉上的切换器来更改您的个人帐户和您的GitHub 组织帐户。 GitHub 组织帐户中创建的项目由GitHub 组织的成员共享。 若要连接您的 GitHub 组织账户，您可以在这里 [按照步骤](#add-github-organization-account-to-subquery-projects)

![Switch between GitHub accounts](/assets/img/projects-account-switcher.png)

#### 创建您的第一个项目。

让我们先点击“创建项目”。 您将被带到新的项目表格。 请输入以下内容(您将来可以更改):
- **GitHub 帐户：** 如果您有多个GitHub 帐户，请选择该项目将在哪个帐户下创建。 GitHub 组织账户中创建的项目由该组织的成员共享。
- **名称**
- **副标题**
- **描述**
- **GitHub 存储库 URL：** 这必须是包含您的 SubQuery 项目的公共存储库的有效 GitHub URL。 `schema.graphql` 文件必须是您目录的根目录([了解更多关于目录结构](../create/introduction.md#directory-structure))。
- **隐藏项目：** 如果选中，如果选中，这将在公共 SubQuery 浏览器中隐藏项目。 如果您想要与社区分享您的 SubQuery，请保持此选项！ ![Create your first Project](/assets/img/projects-create.png)

创建您的项目，您将在 SubQuery 项目列表中看到。 *到这里，就即将完成了！ 我们只需要再部署一个新版本。*

![Created Project with no deployment](/assets/img/projects-no-deployment.png)

#### 完成部署您的第一个版本

虽然创建项目将设置项目的显示行为，但您必须先部署一个版本才能运行。 部署一个版本会触发一个新的 SubQuery 索引操作来启动，并设置所需的查询服务来开始接受 GraphQL 请求。 您也可以在这里部署新版本到现有的项目。

通过您的新项目，您将看到一个部署新版本按钮。 点击此项，填写所需的部署信息：
- **新版本的提交哈希：** 来自GitHub 复制您想要部署的 SubQuery 项目代码库版本的完整提交哈希
- **Indexer Version:**如果您想要运行这个SubQuery，这是SubQuery节点服务的版本。 请见 [`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **查询版本：** 这是您想运行此SubQuery查询服务的版本。 请见 [`@subql/query`](https://www.npmjs.com/package/@subql/query)

![Deploy your first Project](https://static.subquery.network/media/projects/projects-first-deployment.png)

如果配置成功，你将看到索引器开始工作并报告当前链索引的进展情况。 这个过程可能需要时间，直到达到100%。

## 下一步 - 连接到您的项目
一旦您的部署成功完成并且我们的节点已经从该链中为您的数据编制了索引， 您可以通过显示的 GraphQL 查询端点连接到您的项目。

![Project being deployed and synced](/assets/img/projects-deploy-sync.png)

或者，您可以点击项目标题旁边的三个点并在 SubQuery Explorer 上查看它。 您可以在这里使用浏览器内的播放场开始 - [阅读更多关于如何在这里使用我们的资源管理器](../query/query.md) 的信息。

![Projects in SubQuery Explorer](/assets/img/projects-explorer.png)

## 将 GitHub 组织帐户添加到 SubQuery 项目

发布您的 SubQuery 项目的名字是您的 GitHub 组织帐户，而不是您的个人GitHub 帐户。 在任何时候，您都可以使用 [SubQuery 项目](https://project.subquery.network) 更改您当前选定的账户。

![Switch between GitHub accounts](/assets/img/projects-account-switcher.png)

如果您看不到您的 GitHub 组织帐户列在交换机中， 您可能需要授予您的 GitHub 组织 SubQuery 访问权限(或向管理员请求访问权限)。 要做到这一点，您首先需要撤销您的 GitHub 帐户的权限到 SubQuery 应用程序。 要做到这一点，请登录您在 GitHub 中的帐户设置，请转到应用程序，并在授权的 OAuth 应用程序选项卡下登录。 撤销SubQuery - [您可以在这里跟随精确的步骤](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth)。 **不要担心，这将不会删除您的 SubQuery 项目，并且您不会丢失任何数据**

![Revoke access to GitHub account](/assets/img/project_auth_revoke.png)

一旦您撤销访问权限，请注销 [SubQuery 项目](https://project.subquery.network) 并重新登录。 您应该被重定向到一个名为“ *授权 SubQuery* 的页面，在那里您可以请求或授予您的 GitHub 组织帐户的 SubQuery 权限。 如果您没有管理员权限，您必须请求一个管理员来为您启用此权限。

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

一旦您的管理员批准了此请求(或者如果您能够授予此请求)， 您将在账户切换器中看到正确的 GitHub 组织帐户。
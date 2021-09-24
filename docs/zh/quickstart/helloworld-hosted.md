# Hello World (由SubQuery 托管)

本快速入门的目的是展示如何通过几个简单的步骤让默认启动项目在 SubQuery Projects（我们的管理服务）中运行。

我们将采用简单的入门项目（以及我们学到的所有内容）。 但我们不会在 Docker 中本地运行它，而是利用 SubQuery 的托管基础架构。 换言之，我们会让 SubQuery 完成所有繁重的工作，运行和管理生产基础设施。

## 学习目标

在本快速入门结束时，您应该：

- 了解所需的先决条件
- 能够在[SubQuery Projects](https://project.subquery.network/)中托管项目
- 运行一个简单的查询以使用 Playground 来获取 Polkadot 主网的块高度
- 运行一个简单的 GET 查询以使用 cURL 来获取 Polkadot 主网的块高度

## 目标听众

本指南面向具有一些开发经验并有兴趣了解更多关于 SubQuery 的新开发人员。

## 视频指南

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 先决条件

你将会需要：

- 一个 GitHub 帐户

## 1. 第 1 步：创建您的项目

让我们创建一个叫做subql_hellowworld 的项目，并使用您最喜欢的软件包管理器运行必需的安装、代码生成和构建。

```shell
> subql init --starter subqlHelloWorld
yarn install
yarn codegen
yarn build
```

不要运行 docker 命令。

## 2. 第 2 步：创建 GitHub 存储库

在 GitHub 中，创建一个新的公共资源库。 提供一个名称并将您的可见性设置为公开。 在这里，一切都会被保留为默认值。

![create github repo](/assets/img/github_create_new_repo.png)

记下您的 GitHub URL，它必须是公开的，SubQuery 才能访问它。

![create github repo](/assets/img/github_repo_url.png)

## 3. 第 3 步：推送到 GitHub

回到您的项目目录，将其初始化为 git 目录。 否则，您可能会收到"fatal: not a git repository (or any of the parent directories): .git”

```shell
git init
```

然后使用以下命令添加远程存储库：

```shell
git remote add origin https://github.com/seandotau/subqlHelloWorld.git
```

这会将您的远程存储库设置为“https://github.com/seandotau/subqlHelloWorld.git”，并将其命名为“origin” — 这是 GitHub 中远程存储库的标准命名法。

下一步，我们通过以下命令将代码添加到我们的存储库中：

```shell
> git add .
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
Counting objects: 100% (14/14), done.
Delta compression using up to 12 threads
Compressing objects: 100% (13/13), done.
Writing objects: 100% (14/14), 59.35 KiB | 8.48 MiB/s, done.
Total 14 (delta 0), reused 0 (delta 0)
To https://github.com/seandotau/subqlHelloWorld.git
 * [new branch]      master -> master

```

push 命令的意思是“请将我的代码从我的主本地存储库推送到原始存储库”。 刷新 GitHub 会显示 GitHub 中的所有代码。

![首次提交](/assets/img/first_commit.png)

现在你已经将你的代码存入GitHub, 让我们来看看如何能够在 SubQuery Projects 中托管它。

## 4. Create your project

浏览此网址 [https://project.subquery.network](https://project.subquery.network) 并使用您的 GitHub 帐户登录。

![欢迎使用 SubQuery Projects](/assets/img/welcome_to_subquery_projects.png)

然后创建一个新项目。

![欢迎使用 SubQuery Projects](/assets/img/subquery_create_project.png)

并用适当的详细信息填写各个字段。

- **GitHub 帐户：** 如果您有多个GitHub 帐户，请选择该项目将在哪个帐户下创建。 在GitHub 组织账户中创建的项目由该组织的成员共享。
- **项目名称：** 在此处为您的项目命名。
- **副标题：** 为您的项目提供副标题。
- **描述：** 解释您的 SubQuery 项目的用途。
- **GitHub 存储库 URL：** 这必须是包含您的 SubQuery 项目的公共存储库的有效 GitHub URL。 schemagraphql 文件必须在您的目录的根目录中。
- **隐藏项目：** 如果选中，如果选中，这将在公共 SubQuery 浏览器中隐藏项目。 如果您想与社区共享您的SubQuery项目，请不要选择此项！

![创建 SubQuery 参数](/assets/img/create_subquery_project_parameters.png)

当您单击创建时，您将被带到控制面板。

![SubQuery Project 控制面板](/assets/img/subquery_project_dashboard.png)

控制面板包含许多有用的信息，例如它使用的网络、它运行的源代码的 GitHub 存储库 URL、它的创建时间和上次更新时间，尤其是部署的详细信息。

## 5. Step 5: Deploy your project

现在您已经在 SubQuery Projects 项目中创建了您的项目，设置显示行为后，下一步是部署您的项目，使其能够运行。 部署一个版本会触发一个新的 SubQuery 索引操作来启动，并设置所需的查询服务来开始接受 GraphQL 请求。 您也可以在这里部署新版本到现有的项目。

您可以选择部署到不同的环境，例如生产槽或暂存槽。 在这里，我们将部署到生产槽。 单击“部署”按钮会显示一个包含以下字段的屏幕：

![部署到生产槽](/assets/img/deploy_production_slot.png)

- **新版本的 Commit Hash：** 从 GitHub 中选择您要部署的 SubQuery 项目代码库的正确交付
- **索引器版本：** 这是您要在其上运行此SubQuery项目的SubQuery节点服务的版本。 请登录此网址参考 [@subql/node](https://www.npmjs.com/package/@subql/node)
- **查询版本：** 这是您要在其上运行此 SubQuery 项目的 SubQuery 查询服务的版本。 请登录此网址参考 [@subql/quiry](https://www.npmjs.com/package/@subql/query)

因为我们只有一个交付，所以下拉菜单中只有一个选项。 我们还将使用最新版本的索引器和查询版本，因此我们将接受默认值，然后单击“部署更新”。

然后，您将看到您的部署处于“正在处理”状态。 在这里，您的代码正在部署到 SubQuery 的托管基础架构上。 服务器正在按需启动并准备为您提供服务。 这将需要几分钟的时间。

![部署处理](/assets/img/deployment_processing.png)

目前正在进行部署。

![正在进行部署](/assets/img/deployment_running.png)

## 6. Step 6: Testing your project

要测试您的项目，请单击省略号并选择“在SubQuery浏览器上查看”。

![查看 Subquery project](/assets/img/view_on_subquery.png)

这将带您进入熟悉的“Playground”，您可以在其中单击播放按钮并查看查询结果。

![Subquery playground](/assets/img/subquery_playground.png)

## 7. 第 7 步：奖励步骤

对于我们中的敏锐者，您会记得在学习目标中，最后一点是运行一个简单的 GET 查询。 为此，我们需要获取部署详细信息中显示的“查询端点”。

![查询结束](/assets/img/query_endpoint.png)

然后您可以使用您最喜欢的客户端，例如 [Postman](https://www.postman.com/) 或 [Mockoon](https://mockoon.com/) 或通过您终端中的 cURL 将GET 请求发送到这个端点。 为了简单起见，cURL 将在下面显示。

要运行的 curl 命令是：

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

给出以下结果：

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

可读性在这里不是问题，因为您可能会有一些前端代码来使用和解析这个 JSON 响应。

## 概括

在这个 SubQuery 托管的快速入门中，我们展示了获取 Subql 项目并将其部署到 [SubQuery Projects](https://project.subquery.network) 是多么快速和简单，这里为您提供所以的基础设施。 并且有一个用于运行各种查询的内置playground，以及一个供您的代码集成的 API 端点。

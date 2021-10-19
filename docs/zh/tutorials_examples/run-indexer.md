# 如何运行索引器节点?

## 视频教程

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/QfNsR12ItnA" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 简介

运行索引器节点是在使用 Docker或在 [SubQuery 项目](https://project.subquery.network/) 上为您托管项目之外的另一个选项。 它需要花费更多的时间和精力，但是它将增强您对SubQuery工作原理的了。

## 数据库

在您的基础设施上运行索引器节点需要设置Postgres数据库。 您可以从 [这里安装](https://www.postgresql.org/download/) Postgres，并确保版本为12或更高。

## 安装子ql/节点

运行一个 SubQuery 节点，需要运行以下命令：

```shell
npm install-g @subql/node
```

-g 表明全局安装，这意味着在 OSX 上的位置： /usr/local/lib/node_modules.

一旦安装完毕，您可以通过以下命令来检查版本：

```shell
> subql-node --version
0.19.1
```

## 数据库配置

接下来，你需要设置以下环境变量：

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
```

当然，如果您想修改上述键值，请相应调整。 请注意， `env` 命令将显示当前的环境变量，这个进程只是临时设置这些值。 这就是说，它们只适用于终端会话。 若要永久设置它们，请将它们存储在您的 ~/bash_profile中。

## 为项目编制索引

要开始对一个项目进行索引，请进入您的项目文件夹并运行以下命令：

```shell
subql-node -f .
```

如果你还没有项目，请使用 `git clone https://github.com/subquery/subql-helloworld`。 您应该看到indexer节点开始运行并开始索引块。

## 检查Postgres

如果您导航到 Postgres，您应该看到两个表已创建。 `public.subquestions` 和`subquery_1.starter_entities`.

`public.subqueries` 仅包含1行，索引器在启动时检查该行以“了解当前状态”，以便知道从哪里继续。 `starter_entities` 表格包含索引。 要查看数据，运行 `select (*) from subquery_1.starter_entities.
` 。

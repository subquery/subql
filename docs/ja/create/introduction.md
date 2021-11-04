# チュートリアルと例

[クイックスタート](/quickstart/quickstart.md) ガイドで SubQueryとは何か、そしてどのように動作するのかを説明するために、簡単な例を見てみました。 ここでは、プロジェクトを作成する際のワークフローと、使用する主要なファイルを詳しく見ていきます。

## SubQuery の例

以下の例では、 [クイックスタート](../quickstart/quickstart.md) セクションでスターターパッケージを正常に初期化したと仮定します。 そのスターターパッケージから、SubQueryプロジェクトをカスタマイズして実装するための標準プロセスを説明します。

1. `subql init --specVersion 0.2.0 PROJECT_NAME` を使用してプロジェクトを初期化します。 または、古い仕様のバージョン `subql init PROJECT_NAME` を使用することもできます。
2. マニフェストファイル（`project.yaml`）を更新して、ブロックチェーンとマッピングするエンティティに関する情報を含めます。（[マニフェストファイル](./manifest.md)を参照）
3. スキーマ（`schema.graphql`）にGraphQLエンティティを作成し、クエリのために抽出・保存するデータの型を定義します。（[GraphQL Schema](./graphql.md)を参照）
4. チェーンデータを定義したGraphQLエンティティに変換するために呼び出したいすべてのマッピング関数（例：`mappingHandlers.ts`）を追加します。（[Mapping](./mapping.md)を参照）
5. コードの生成、ビルド、SubQuery Projectsへの公開（または自分のローカル・ノードでの実行）をします。（クイック・スタート・ガイドの[Running and Querying your Starter Project](./quickstart.md#running-and-querying-your-starter-project)を参照）

## ディレクトリ構造

以下のマップは、 `init` コマンドの実行時に展開されるSubQuery プロジェクトのディレクトリ構造の概要を示します。

```
- project-name
  L package.json
  L project.yaml
  L README.md
  L schema.graphql
  L tsconfig.json
  L docker-compose.yml
  L src
    L index.ts
    L mappings
      L mappingHandlers.ts
  L .gitignore
```

例

![SubQuery ディレクトリ構造](/assets/img/subQuery_directory_stucture.png)

## コード生成

GraphQL エンティティを変更するたびに、次のコマンドで types ディレクトリを再生成する必要があります。

```
yarn codegen
```

これは`schema.graphql`内で事前に定義した型ごとに生成されたエンティティ・クラスを含む `src/types` ディレクトリを作成します（または既存のディレクトリを更新します）。 これらのクラスは、タイプセーフなエンティティのロード、エンティティフィールドへの読み取りと書き込みのアクセスを提供します。（このプロセスについては、[the GraphQL Schema](./graphql.md)を参照）

## ビルド

ローカルホストの SubQuery Node 上で SubQuery プロジェクトを実行するには、最初にビルド作業をする必要があります。

プロジェクトのルートディレクトリからbuild コマンドを実行します。

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

## ログ出力

`console.log` 関数は **もうサポートが終了してます。** 代わりに、 `logger` モジュールが型に組み込まれています。つまり、さまざまなロガーレベルを受け入れることができるロガーをサポートすることができます。</p>

```typescript
logger.info('Info level message');
logger.debug('Debugger level message');
logger.warn('Warning level message');
```

`logger.info` または `logger.warn`を使用するには、マッピングファイルに行を挿入してください。

![logging.info](/assets/img/logging_info.png)

`logger.debug`を使用するには、追加のステップが必要です。 コマンドラインに `--log-level=debug` を追加します。

Docker containerを実行している場合は、 `docker-compose.yaml` ファイルにこの行を追加してください。

![logging.debug](/assets/img/logging_debug.png)

ターミナル画面に新しいログが表示されます。

![logging.debug](/assets/img/subquery_logging.png)

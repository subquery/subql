# マニフェストファイル

マニフェストファイル `project.yaml` は、プロジェクトのエントリー・ポイントと見なすことができ、SubQuery がどのようにインデックスを作成し、チェーン・データを変換するかについて詳細を定義します。

マニフェストは YAML または JSON 形式で使用できます。 このドキュメントでは、すべての例で YAML を使用します。 以下は、基本的な `project.yaml` の標準的な例です。

<CodeGroup> <CodeGroupItem title="v0.2.0" active> ``` yml specVersion: 0.2.0 name: example-project # Provide the project name version: 1.0.0  # Project version description: '' # Description of your project repository: 'https://github.com/subquery/subql-starter' # Git repository address of your project schema: file: ./schema.graphql # The location of your GraphQL schema file network: genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' # Genesis hash of the network endpoint: 'wss://polkadot.api.onfinality.io/public-ws' # Optionally provide the HTTP endpoint of a full chain dictionary to speed up processing dictionary: 'https://api.subquery.network/sq/subquery/dictionary-polkadot' dataSources: - kind: substrate/Runtime startBlock: 1 # This changes your indexing start block, set this higher to skip initial blocks with less data mapping: file: "./dist/index.js" handlers: - handler: handleBlock kind: substrate/BlockHandler - handler: handleEvent kind: substrate/EventHandler filter: #Filter is optional module: balances method: Deposit - handler: handleCall kind: substrate/CallHandler ```` </CodeGroupItem>
<CodeGroupItem title="v0.0.1"> ``` yml specVersion: "0.0.1" description: '' # Description of your project repository: 'https://github.com/subquery/subql-starter' # Git repository address of your project schema: ./schema.graphql # The location of your GraphQL schema file network: endpoint: 'wss://polkadot.api.onfinality.io/public-ws' # Optionally provide the HTTP endpoint of a full chain dictionary to speed up processing dictionary: 'https://api.subquery.network/sq/subquery/dictionary-polkadot' dataSources: - name: main kind: substrate/Runtime startBlock: 1 # This changes your indexing start block, set this higher to skip initial blocks with less data mapping: handlers: - handler: handleBlock kind: substrate/BlockHandler - handler: handleEvent kind: substrate/EventHandler filter: #Filter is optional but suggested to speed up event processing module: balances method: Deposit - handler: handleCall kind: substrate/CallHandler ```` </CodeGroupItem> </CodeGroup>

## v0.0.1からv0.2.0への移行 <Badge text="upgrade" type="warning"/>

**specVersion v0.0.1のプロジェクトがあれば、`subql migrate`を使って素早くアップグレードすることができます。 [詳細はこちら](#cli-options) を参照**

`network` 下:

- 使用されているチェーンを識別するのに役立つ `genesisHash` フィールドが新たに**必須**となりました。
- v0.2.0 以上では、カスタムチェーンを参照している場合、外部 [チェーンタイプ ファイル](#custom-chains) を参照できます。

`dataSources` 下:

- マッピングハンドラの `index.js` エントリポイントを直接リンクすることができます。 デフォルトでは、この `index.js` は、ビルド プロセス中に `index.ts` から生成されます。
- データソースは、通常のランタイムデータソースまたは [カスタムデータソース](#custom-data-sources)のいずれかになります。

### コマンドラインオプション

v0.2.0のスペックバージョンはベータ版ですが、プロジェクトの初期化時に`subql init --specVersion 0.2.0 PROJECT_NAME`を実行して、明示的に定義する必要があります。

`subql migration` は既存のプロジェクトで実行して、プロジェクトマニフェストを最新バージョンに移行できます。

| オプション          | 説明                                     |
| -------------- | -------------------------------------- |
| -f, --force    |                                        |
| -l, --location | 移行するローカル フォルダ (project.yamlを含む必要があります) |
| --file=file    | 移行するproject.yaml を指定します                |

## 概要

### トップレベルの仕様

| フィールド           | v0.0.1                              | v0.2.0                      | 説明                                    |
| --------------- | ----------------------------------- | --------------------------- | ------------------------------------- |
| **specVersion** | String                              | String                      | `0.0.1` または `0.2.0` - マニフェストファイルバージョン |
| **name**        | 𐄂                                   | String                      | プロジェクト名                               |
| **version**     | 𐄂                                   | String                      | プロジェクトのバージョン                          |
| **description** | String                              | String                      | あなたのプロジェクトの説明                         |
| **repository**  | String                              | String                      | プロジェクトの Git リポジトリアドレス                 |
| **schema**      | String                              | [Schema Spec](#schema-spec) | GraphQLスキーマファイルの場所                    |
| **network**     | [Network Spec](#network-spec)       | Network Spec                | インデックスを作成するネットワークの詳細                  |
| **dataSources** | [DataSource Spec](#datasource-spec) | DataSource Spec             |                                       |

### スキーマの仕様

| フィールド    | v0.0.1 | v0.2.0 | 説明                 |
| -------- | ------ | ------ | ------------------ |
| **file** | 𐄂      | String | GraphQLスキーマファイルの場所 |

### ネットワークの仕様

| フィールド           | v0.0.1 | v0.2.0        | 説明                                                                                                                                             |
| --------------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **genesisHash** | 𐄂      | String        | ネットワークの生成ハッシュ                                                                                                                                  |
| **endpoint**    | String | String        | インデックスするブロックチェーンのwssまたはwsエンドポイントを定義します - **これはフルアーカイブノード** でなければなりません。 [OnFinality](https://app.onfinality.io)では、すべてのパラチェーンのエンドポイントを無料で取得できます。 |
| **dictionary**  | String | String        | 処理を高速化するために、フルチェーンディクショナリのHTTPエンドポイントを提供することが推奨されます。[SubQuery Dictionaryの仕組み](../tutorials_examples/dictionary.md)を参照してください。                   |
| **chaintypes**  | 𐄂      | {file:String} | チェーンタイプファイルへのパス。 `.json` または `.yaml` 形式を使用してください。                                                                                              |

### データソース仕様

フィルターされ抽出されるデータと、適用されるデータ変換のためのマッピング関数ハンドラーの場所を定義します。
| フィールド          | v0.0.1                                                    | v0.2.0                                                                           | 説明                                                                                                                          |
| -------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **name**       | String                                                    | 𐄂                                                                                | データソースの名前                                                                                                                   |
| **kind**       | [substrate/Runtime](./manifest/#data-sources-and-mapping) | substrate/Runtime, [substrate/CustomDataSource](./manifest/#custom-data-sources) | デフォルトのsubstrateランタイムから、ブロック、イベント、外部関数(コール)などのデータタイプをサポートしています。 <br /> v0.2.0からは、スマートコントラクトなどのカスタムランタイムからのデータをサポートします。 |
| **startBlock** | Integer                                                   | Integer                                                                          | インデックス開始ブロックを変更します。データ量が少ない最初のブロックをスキップするように設定します。                                                                          |
| **mapping**    | Mapping Spec                                              | Mapping Spec                                                                     |                                                                                                                             |
| **filter**     | [network-filters](./manifest/#network-filters)            | 𐄂                                                                                | ネットワークエンドポイントの仕様名で実行するデータソースをフィルタする                                                                                         |

### マッピング仕様

| フィールド            | v0.0.1                                                      | v0.2.0                                                             | 説明                                                                                                                                                                      |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **file**         | String                                                      | 𐄂                                                                  | マッピングエントリへのパス                                                                                                                                                           |
| **ハンドラ & フィルター** | [デフォルトのハンドラとフィルタ](./manifest/#mapping-handlers-and-filters) | デフォルトのハンドラとフィルタ、 <br />[カスタムハンドラとフィルタ](#custom-data-sources) | 追加のマッピングフィルタを使用して、すべての [マッピング関数](./mapping.md) とそれに対応するハンドラータイプをリストします。 <br /><br /> カスタムランタイムマッピングハンドラについては、 [カスタムデータソース](#custom-data-sources) を参照してください。 |

## データソースとマッピング

このセクションでは、デフォルトの Substrate ランタイムとそのマッピングについて説明します。 次に例を示します。

```yaml
dataSources:
  - kind: substrate/Runtime # Indicates that this is default runtime
    startBlock: 1 # This changes your indexing start block, set this higher to skip initial blocks with less data
    mapping:
      file: dist/index.js # Entry path for this mapping
```

### デフォルトのハンドラとフィルタ

以下の表では、異なるハンドラでサポートされているフィルタについて説明します。

**SubQuery プロジェクトは、イベントと適切なマッピングフィルタを使用するだけで、より効率的になります。**

| ハンドラ                                       | サポートされるフィルタ                  |
| ------------------------------------------ | ---------------------------- |
| [BlockHandler](./mapping.md#block-handler) | `specVersion`                |
| [EventHandler](./mapping.md#event-handler) | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)   | `module`,`method` ,`success` |

デフォルトのランタイムマッピングフィルタは、どのブロック、イベント、または外部のどちらがマッピングハンドラをトリガーするかを決定するために非常に便利な機能です。

フィルター条件を満たす受信データのみがマッピング関数により処理されます。 マッピングフィルタはオプションですが、SubQuery プロジェクトによって処理されるデータの量を大幅に削減し、インデックス作成のパフォーマンスを向上させるために強く推奨されます。

```yaml
# Example filter from callHandler
filter:
  module: balances
  method: Deposit
  success: true
```

- モジュールとメソッドフィルタは、Substrate-based chainでサポートされています。
- `success` フィルタはブール値を取り、成功状況によって外部値をフィルタリングするために使用できます。
- `specVersion` フィルタは、Substrate ブロックの仕様バージョン範囲を指定します。 以下の例では、バージョン範囲を設定する方法を説明します。

```yaml
filter:
  specVersion: [23, 24]   # Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      # Index block with specVersion greater than or equal 100.
  specVersion: [null, 23] # Index block with specVersion less than or equal 23.
```

## カスタムチェーン

### ネットワークの仕様

別のPolkadot parachainやカスタムsubstrateチェーンに接続する場合は、このマニフェストの [ネットワークの仕様](#network-spec) セクションを編集する必要があります。

`genesisHash` は常にカスタムネットワークの最初のブロックのハッシュでなければなりません。  [PolkadotJS](https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fkusama.api.onfinality.io%2Fpublic-ws#/explorer/query/0) にアクセスして、**block 0** のハッシュを探せば、これを簡単に回収することができます（下の画像参照）。

![Genesis Hash](/assets/img/genesis-hash.jpg)

さらに、 `エンドポイント` を更新する必要があります。 インデックスするブロックチェーンのwssまたはwsエンドポイントを定義します - **これはフルアーカイブノード** でなければなりません。 [OnFinality](https://app.onfinality.io)では、すべてのパラチェーンのエンドポイントを無料で取得できます。

### チェーンタイプ

マニフェストにチェーンタイプを含めることで、カスタムチェーンからのデータのインデックスを作成できます。

substrateランタイムモジュールで使用される追加の型をサポートしています。 `typesAlias`、 `typesBundle`、`typesChain`、`typesSpec`もサポートされています。

以下のv0.2.0の例では、`network.chaintypes`は、すべてのカスタムタイプが含まれているファイルを指しています。 これは、このブロックチェーンがサポートする特定のタイプを`.json`または`.yaml`形式で宣言する標準的なチェーンスペックファイルです。

<CodeGroup> <CodeGroupItem title="v0.2.0" active> ``` yml network: genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' endpoint: 'ws://host.kittychain.io/public-ws' chaintypes: file: ./types.json # The relative filepath to where custom types are stored </CodeGroupItem>
<CodeGroupItem title="v0.0.1"> ``` yml ... network: endpoint: "ws://host.kittychain.io/public-ws" types: { "KittyIndex": "u32", "Kitty": "[u8; 16]" } # typesChain: { chain: { Type5: 'example' } } # typesSpec: { spec: { Type6: 'example' } } dataSources: - name: runtime kind: substrate/Runtime startBlock: 1 filter:  #Optional specName: kitty-chain mapping: handlers: - handler: handleKittyBred kind: substrate/CallHandler filter: module: kitties method: breed success: true ``` </CodeGroupItem> </CodeGroup>

## カスタムデータソース

カスタムデータソースは、データの取り扱いを容易にするネットワーク固有の機能を提供します。 これらは、追加のフィルタリングやデータ変換を提供するミドルウェアとして機能します。

その良い例がEVMのサポートです。EVM用のカスタムデータソースプロセッサを持つことは、EVMレベルでのフィルタリング（コントラクトメソッドやログのフィルタリングなど）ができることを意味し、データはABIでパラメータを解析するだけでなく、Ethereumのエコシステムに馴染みのある構造に変換されます。

カスタムデータソースは、通常のデータソースと併用することができます。.

サポートされているカスタムデータソースの一覧です。

| 種類                                                    | サポートされているハンドラ                                                                                            | フィルタ                            | 説明                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| [substrate/Moonbeam](./moonbeam/#data-source-example) | [substrate/MoonbeamEvent](./moonbeam/#moonbeamevent), [substrate/MoonbeamCall](./moonbeam/#moonbeamcall) | See filters under each handlers | Provides easy interaction with EVM transactions and events on Moonbeams networks |

## ネットワークフィルタ

**ネットワークフィルタは、マニフェスト仕様v0.0.1にのみ適用されます。**.

通常、ユーザーはSubQueryを作成し、それをテストネットとメインネットの両方の環境で再利用することを想定しています。（例：PolkadotやKusamaなど） ネットワーク間では、さまざまなオプションが異なる可能性があります。(インデックス開始ブロックなど) したがって、ユーザーがデータソースごとに異なる詳細を定義できるようにすることで、1つのSubQueryプロジェクトを複数のネットワークで使用することができます。

各ネットワークで実行するデータソースを決定するために、 `filter` を `dataSources` に追加できます。

以下は Polkadot と Kusama ネットワークの異なるデータソースを示す例です。

<CodeGroup> <CodeGroupItem title="v0.0.1"> ```yaml --- network: endpoint: 'wss://polkadot.api.onfinality.io/public-ws' #Create a template to avoid redundancy definitions: mapping: &mymapping handlers: - handler: handleBlock kind: substrate/BlockHandler dataSources: - name: polkadotRuntime kind: substrate/Runtime filter: #Optional specName: polkadot startBlock: 1000 mapping: *mymapping #use template here - name: kusamaRuntime kind: substrate/Runtime filter: specName: kusama startBlock: 12000 mapping: *mymapping # can reuse or change ``` </CodeGroupItem>

</CodeGroup>

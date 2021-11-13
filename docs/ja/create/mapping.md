# マッピング

マッピング関数は、 `schema.graphql` ファイルで定義したチェーンデータを最適化したGraphQLエンティティに変換する方法を定義します。

- マッピングは `src/mappings` ディレクトリに定義され、関数としてエクスポートされます。
- これらのマッピングは `src/index.ts` にもエクスポートされます。
- マッピングファイルはマッピングハンドラの下の `project.yaml` 内で参照されます。

マッピング関数には次の3つのクラスがあります。 [ブロックハンドラ](#block-handler), [イベントハンドラ](#event-handler), [呼び出しハンドラ](#call-handler)

## ブロックハンドラ

新しいブロックが Substrate チェーンに接続されるたびに、ブロックハンドラを使用して情報を取得できます。例えば、ブロック番号です。 これを実行するために、定義されたブロックハンドラが各ブロックに対して1回呼び出されます。

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

[SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16)は[signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/)の拡張インターフェースタイプで、`specVersion`と`timestamp`も含まれています。

## イベント ハンドラ

特定のイベントが新しいブロックに含まれる場合、イベントハンドラを使用して情報を取得できます。 デフォルトの Substrate ランタイムとブロックの一部であるイベントには、複数のイベントが含まれます。

処理中、イベントハンドラは substrate イベントを受け取り、イベントの型付けされた入出力を持つ引数として受け取ります。 任意のタイプのイベントはマッピングを起動し、データソースとのアクティビティをキャプチャすることができます。 イベントをフィルタリングするには、マニフェストで [マッピングフィルタ](./manifest.md#mapping-filters) を使用し、データのインデックス化とマッピングのパフォーマンスを向上させる必要があります。

```ts
import {SubstrateEvent} from "@subql/types";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, balance]}} = event;
    // Retrieve the record by its ID
    const record = new starterEntity(event.extrinsic.block.block.header.hash.toString());
    record.field2 = account.toString();
    record.field3 = (balance as Balance).toBigInt();
    await record.save();
```

[SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) は [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149) の拡張インターフェイス型です。 イベントデータのほかに、 `id` (このイベントが属するブロック) と、このブロックの内部にある外部データも含まれています。

## 呼び出しハンドラ

呼び出しハンドラは、特定の Substrate 外部関数の情報をキャプチャするときに使用されます。

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

[SubstrateExtinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) は [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170) を拡張します。 このブロックには、 `id` (この外部が属するブロック) が割り当てられており、このブロックの中でイベントを拡張する外部プロパティを提供します。 さらに、この外部関数の成功状況を記録します。

## クエリの状態
私たちの目標は、マッピングハンドラ(上記の3つのインターフェイスイベントタイプだけではなく)のためのユーザーのためのすべてのデータソースをカバーすることです。 したがって、私たちは @polkadot/api インタフェースのいくつかを公開しています。

これらは現在サポートされているインターフェースです:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) は <strong>現在の</strong> ブロックを問い合わせます。
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) は、現在のブロックで <strong>同じ</strong> 型の複数のクエリを実行します。
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) は、現在のブロックで <strong>異なる</strong> 型の複数のクエリを実行します。

これらは現在サポート **されていない** インターフェイスです：
- ~~api.tx.*~~
- ~~api.derive.*~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.at~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.hash~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.range~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.sizeAt~~

[validator-threshold](https://github.com/subquery/tutorials-validator-threshold) のユースケースでこの API を使用する例をご覧ください。

## RPCコール

また、マッピング関数が実際のノード、クエリー、および送信を行うことを可能にするリモートコールである API RPC 関数もサポートしています。 SubQueryは決定論的であることを前提としているため、結果の一貫性を保つために、過去のRPCコールのみを許可しています。

[JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc)のドキュメントでは、`BlockHash`を入力パラメータとして受け取るいくつかのメソッド（例：`at?: BlockHash`）がありますが、これが許可されるようになりました。 また、これらの関数は、現在のインデックスブロックハッシュをデフォルトで受け取るように変更しました。

```typescript
// Let's say we are currently indexing a block with this hash number
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d064871148e9d41ef086f6a`;

// Original method has an optional input is block hash
const b1 = await api.rpc.chain.getBlock(blockhash);

// It will use the current block has by default like so
const b2 = await api.rpc.chain.getBlock();
```
- [カスタムサブストレイトチェーン](#custom-substrate-chains) RPCコールについては、 [使用法](#usage) を参照してください。

## モジュールとライブラリ

SubQueryのデータ処理能力を向上させるには [sandbox](#the-sandbox)でマッピング関数を実行するための NodeJS の組み込みモジュールの一部を許可しました。 サードパーティのライブラリを呼び出すことができます

これは **実験的機能** であり、マッピング関数に悪影響を与えるバグや問題が発生する可能性があります。 Issue を [GitHub](https://github.com/subquery/subql) で作成することで、バグを報告してください。

### 組み込みモジュール

現在、次のNodeJSモジュールを許可しています：`assert`, `buffer`, `crypto`, `util`,  `path`

モジュール全体をインポートするのではなく、必要なメソッドだけをインポートすることをお勧めします。 これらのモジュールのいくつかのメソッドにはサポートされていない依存関係があり、インポート時に失敗する可能性があります。

```ts
import {hashMessage} from "ethers/lib/utils"; //Good way
import {utils} from "ethers" //Bad way

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field1 = hashMessage('Hello');
    await record.save();
}
```

### サードパーティライブラリ

サンドボックス内の仮想マシンが制限されているため、現在、 **CommonJS** によって書かれたサードパーティ製ライブラリのみをサポートしています。

**hybrid** ライブラリ(例えば `@polkadot/*` )もサポートしており、ESM をデフォルトとして使用しています。 しかし、他のライブラリが**ESM**形式のモジュールに依存している場合、仮想マシンはコンパイル**されず**、エラーを返します。

## カスタムサブストレイトチェーン

SubQuery は、Polkadot や Kusama だけではなく、Substrate-based chain 上で使用できます。

Substrateベースのカスタムチェーンを使用することができ、[@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/)を使用してタイプ、インターフェイス、追加関数を自動的にインポートするツールを提供しています。

以下のセクションでは、 [キティの例](https://github.com/subquery/tutorials-kitty-chain) を使用して統合プロセスを説明します。

### 準備

プロジェクトの `src` フォルダの下に新しいディレクトリ `api-interfaces` を作成し、必要なファイルと生成されたファイルをすべて保存します。 `kitties` モジュールからAPIにデコレーションを追加するため、 `api-interfaces/kitties` ディレクトリを作成します。

#### メタデータ

実際のAPIエンドポイントを生成するにはメタデータが必要です。 キティの例では、ローカルのテストネットからのエンドポイントを使用し、追加の型を提供します。 [PolkadotJS metadata setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) の手順に従い、 **HTTP** endpoint からノードのメタデータを取得します。

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
または、[`websocat`](https://github.com/vi/websocat)の助けを借りて、**websocket**エンドポイントから

```shell
//Install the websocat
brew install websocat

//Get metadata
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

次に、JSONファイルに出力結果をコピーし、貼り付けます。 [キティの例](https://github.com/subquery/tutorials-kitty-chain)では、 `api-interface/kitty.json` を作成しました。

#### 型の定義
ここでは、ユーザーがチェーンから特定のタイプとRPCサポートを知っており、それが[Manifest](./manifest.md)で定義されていることを想定しています。

[types setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup)に続いて作成します
- `src/api-interfaces/definitions.ts` - 全てのサブフォルダ定義をエクスポートします

```ts
export { default as kitties } from './kitties/definitions';
```

- `src/api-interfaces/kities/definitions.ts` - kittiesモジュールの型定義
```ts
export default {
    // custom types
    types: {
        Address: "AccountId",
        LookupSource: "AccountId",
        KittyIndex: "u32",
        Kitty: "[u8; 16]"
    },
    // custom rpc : api.rpc.kitties.getKittyPrice
    rpc: {
        getKittyPrice:{
            description: 'Get Kitty price',
            params: [
                {
                    name: 'at',
                    type: 'BlockHash',
                    isHistoric: true,
                    isOptional: false
                },
                {
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isOptional: false
                }
            ],
            type: 'Balance'
        }
    }
}
```

#### パッケージ

- `package.json`ファイルでは、`@polkadot/typegen`を開発用の依存関係に、`@polkadot/api`を通常の依存関係（理想的には同じバージョン）に追加してください。 また、スクリプトを実行するために、開発の依存性として `ts-node` も必要です。
- 両方の型を実行するスクリプトを追加します; `generate:defs` と メタデータジェネレータ`generate:metadata` (この順序で、メタデータが型を使用できるようにします)

以下は `package.json` の簡略化されたバージョンです。 **スクリプト** セクションでパッケージ名が正しく、ディレクトリが有効であることを確認します。

```json
{
  "name": "kitty-birthinfo",
  "scripts": {
    "generate:defs": "ts-node --skip-project node_modules/.bin/polkadot-types-from-defs --package kitty-birthinfo/api-interfaces --input ./src/api-interfaces",
    "generate:meta": "ts-node --skip-project node_modules/.bin/polkadot-types-from-chain --package kitty-birthinfo/api-interfaces --endpoint ./src/api-interfaces/kitty.json --output ./src/api-interfaces --strict"
  },
  "dependencies": {
    "@polkadot/api": "^4.9.2"
  },
  "devDependencies": {
    "typescript": "^4.1.3",
    "@polkadot/typegen": "^4.9.2",
    "ts-node": "^8.6.2"
  }
}
```

### 型の生成

これで準備が完了し、型とメタデータを生成する準備が整いました。 以下のコマンドを実行します。

```shell
# Yarn to install new dependencies
yarn

# Generate types
yarn generate:defs
```

各モジュールのフォルダ（例：`/kitties`）には、このモジュールの定義からすべてのインターフェイスを定義した`types.ts`と、それらすべてをエクスポートする`index.ts`が生成されているはずです。

```shell
# Generate metadata
yarn generate:meta
```

このコマンドは、API のメタデータと新しい拡張機能を生成します。 組み込みのAPIを使用したくないので、`tsconfig.json`に明示的なオーバーライドを追加して置き換える必要があります。 更新後、設定内のパスは次のようになります(コメントなし):

```json
{
  "compilerOptions": {
      // this is the package name we use (in the interface imports, --package for generators) */
      "kitty-birthinfo/*": ["src/*"],
      // here we replace the @polkadot/api augmentation with our own, generated from chain
      "@polkadot/api/augment": ["src/interfaces/augment-api.ts"],
      // replace the augmented types with our own, as generated from definitions
      "@polkadot/types/augment": ["src/interfaces/augment-types.ts"]
    }
}
```

### 使用法

マッピング関数では、メタデータと型が実際にAPIをどのようにデコレートするかを示すことができます。 RPCエンドポイントは、上記で宣言したモジュールと関数をサポートします。 カスタムRPC呼び出しを使用するには、[カスタムチェーンRPC呼び出し](#custom-chain-rpc-calls)のセクションを参照してください。
```typescript
export async function kittyApiHandler(): Promise<void> {
    //return the KittyIndex type
    const nextKittyId = await api.query.kitties.nextKittyId();
    // return the Kitty type, input parameters types are AccountId and KittyIndex
    const allKitties  = await api.query.kitties.kitties('xxxxxxxxx',123)
    logger.info(`Next kitty id ${nextKittyId}`)
    //Custom rpc, set undefined to blockhash
    const kittyPrice = await api.rpc.kitties.getKittyPrice(undefined,nextKittyId);
}
```

**このプロジェクトをエクスプローラに公開したい場合は、生成されたファイルを `src/api-interface` に含めてください。**

### カスタムチェーンRPCコール

カスタマイズされたチェーンRPC呼び出しをサポートするには、仕様ごとの設定を可能にする `typesBundle`に手動でRPC定義を挿入する必要があります。 `project.yml` で `typesBundle` を定義できます。 そして、 `isHistoric` タイプの呼び出しのみがサポートされていることを覚えておいてください。
```yaml
...
  types: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]",
  }
  typesBundle: {
    spec: {
      chainname: {
        rpc: {
          kitties: {
            getKittyPrice:{
                description: string,
                params: [
                  {
                    name: 'at',
                    type: 'BlockHash',
                    isHistoric: true,
                    isOptional: false
                  },
                  {
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isOptional: false
                  }
                ],
                type: "Balance",
            }
          }
        }
      }
    }
  }

```

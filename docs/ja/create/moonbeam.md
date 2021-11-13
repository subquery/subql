# MoonbeamのEVMサポート

MoonbeamとMoonriverのEVM用にカスタムデータソースプロセッサを提供しています。 これにより、1つのSubQueryプロジェクトで、Moonbeamのネットワーク上のEVMとSubstrateの両方のアクティビティを簡単にフィルタリングし、インデックスを付けることができます。

サポートされているネットワーク:

| ネットワーク名        | Websocket エンドポイント                                  | ディクショナリエンドポイント                                                       |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Moonbeam       | _準備中_                                              | _準備中_                                                                |
| Moonriver      | `wss://moonbeam-alpha.api.onfinality.io/public-ws` | `https://api.subquery.network/sq/subquery/moonriver-dictionary`      |
| Moonbase Alpha | `wss://moonriver.api.onfinality.io/public-ws`      | `https://api.subquery.network/sq/subquery/moonbase-alpha-dictionary` |

**また、イベントと呼び出しハンドラを備えた[basic Moonriver EVM example project](https://github.com/subquery/tutorials-moonriver-evm-starter)を参照することもできます。**このプロジェクトは、[SubQuery Explorer](https://explorer.subquery.network/subquery/subquery/moonriver-evm-starter-project)でもご覧いただけます。

## はじめに

1. 依存関係としてカスタムデータソースを追加する `yarn add @subql/contract-processor`
2. 以下の説明に従ってカスタムデータソースを追加する
3. カスタムデータソースのハンドラをコードに追加する

## データソース仕様

| フィールド             | 型                                                              | 必須  | 説明                    |
| ----------------- | -------------------------------------------------------------- | --- | --------------------- |
| processor.file    | `'./node_modules/@subql/contract-processors/dist/moonbeam.js'` | Yes | データプロセッサコードへのファイル参照   |
| processor.options | [ProcessorOptions](#processor-options)                         | No  | Moonbeamプロセッサ固有のオプション |
| assets            | `{ [key: String]: { file: String }}`                           | No  | 外部アセットファイルのオブジェクト     |

### プロセッサオプション

| フィールド   | 型                | 必須 | 説明                                                          |
| ------- | ---------------- | -- | ----------------------------------------------------------- |
| abi     | String           | No | 引数を解析するためにプロセッサが使用する ABI です。 `assets` のキーでなければなりません         |
| address | String or `null` | No | イベントの発信元または発信先となるコントラクトアドレス。 `null` はコントラクトの作成呼び出しをキャプチャします |

## MoonbeamCall

別のハンドラ引数とマイナーなフィルタリング変更を除いては、 [substrate/CallHandler](../create/mapping/#call-handler) と同じように動作します。

| フィールド  | 型                            | 必須  | 説明                   |
| ------ | ---------------------------- | --- | -------------------- |
| kind   | 'substrate/MoonbeamCall'     | Yes | 呼び出しハンドラであることを指定します。 |
| filter | [Call Filter](#call-filters) | No  | 実行するデータソースをフィルタする    |

### コールフィルタ

| フィールド    | 型      | 例                                             | 説明                                                                                                                              |
| -------- | ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| function | String | 0x095ea7b3, approve(address to,uint256 value) | [関数シグネチャ](https://docs.ethers.io/v5/api/utils/abi/fragments/#FunctionFragment) 文字列、またはコントラクトで呼び出された関数をフィルタする関数 `sighash` のいずれか。 |
| from     | String | 0x6bd193ee6d2104f14f94e2ca6efefae561a4334b    | トランザクションを送信したイーサリアムアドレス                                                                                                         |

### ハンドラ

通常のハンドラーとは異なり、パラメータとして`SubstrateExtrinsic`を得ることはできませんが、代わりにイーサリアム[TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse)タイプに基づいた`MoonbeamCall`を得ることができます。

`TransactionResponse` 型からの変更:

- `wait` と `confirmations` プロパティがありません
- `success` プロパティが追加され、トランザクションが成功したかどうかが分かります
- `args` は `abi` フィールドが指定され、引数が正常に解析される場合に追加されます。

## MoonbeamEvent

別のハンドラ引数とマイナーなフィルタリング変更を除いては、 [substrate/EventHandler](../create/mapping/#event-handler) と同じように動作します。

| フィールド  | 型                              | 必須  | 説明                   |
| ------ | ------------------------------ | --- | -------------------- |
| kind   | 'substrate/MoonbeamEvent'      | Yes | 呼び出しハンドラであることを指定します。 |
| filter | [Event Filter](#event-filters) | No  | 実行するデータソースをフィルタする    |

### イベントフィルタ

| フィールド  | 型            | 例                                                            | 説明                                                                                                  |
| ------ | ------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| topics | String array | Transfer(address indexed from,address indexed to,u256 value) | トピックフィルタは、Ethereum JSON-PRCログフィルタに従います。詳細なドキュメントは[こちら](https://docs.ethers.io/v5/concepts/events/). |

<b>topicsに関する注意:</b>
基本的なログフィルタにはいくつかの改善点があります:

- topicsを 0 埋めする必要はありません。
- [イベントフラグメント](https://docs.ethers.io/v5/api/utils/abi/fragments/#EventFragment) の文字列を提供し、そのIDに自動的に変換できます

### ハンドラ

通常のハンドラとは異なり、パラメータとして`SubstrateEvent`を得ることはなく、代わりにイーサリアム[Log](https://docs.ethers.io/v5/api/providers/types/#providers-Log)タイプに基づいた`MoonbeamEvent`を得ることになります。

`ログ` タイプからの変更:

- `args` は `abi` フィールドが指定され、引数が正常に解析される場合に追加されます。

## データソースの例

これは、 `project.yaml` マニフェストファイルから抽出してます。

```yaml
dataSources:
  - kind: substrate/Moonbeam
    startBlock: 752073
    processor:
      file: './node_modules/@subql/contract-processors/dist/moonbeam.js'
      options:
        # Must be a key of assets
        abi: erc20
        # Contract address (or recipient if transfer) to filter, if `null` should be for contract creation
        address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'
    assets:
      erc20:
        file: './erc20.abi.json'
    mapping:
      file: './dist/index.js'
      handlers:
        - handler: handleMoonriverEvent
          kind: substrate/MoonbeamEvent
          filter:
            topics:
              - Transfer(address indexed from,address indexed to,u256 value)
        - handler: handleMoonriverCall
          kind: substrate/MoonbeamCall
          filter:
            ## The function can either be the function fragment or signature
            # function: '0x095ea7b3'
            # function: '0x7ff36ab500000000000000000000000000000000000000000000000000000000'
            # function: approve(address,uint256)
            function: approve(address to,uint256 value)
            from: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'
```

## 既知の制限事項

- ハンドラ内のEVM状態を問い合わせる方法は現在ありません。
- 呼び出しハンドラで戻り値を取得する方法はありません。
- `blockHash` プロパティは現在未定義のままです。代わりに `blockNumber` プロパティを使用できます。

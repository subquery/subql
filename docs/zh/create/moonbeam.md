# Moonbeam EVM 支持

我们为Moonbeam和Moonriver的EVM提供了一个自定义数据源处理器。 这为单一的 SubQuery 项目中提供了一种简单的方法来筛选和索引Moonbeam的网络上的 EVM 和 底层活动。

支持的网络：

| 网络名称           | Websocket 终端                                       | Dictionary 终端                                                        |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Moonbeam       | _即将上线_                                             | _即将上线_                                                               |
| Moonriver      | `wss://moonriver.api.onfinality.io/public-ws`      | `https://api.subquery.network/sq/subquery/moonriver-dictionary`      |
| Moonbase Alpha | `wss://moonbeam-alpha.api.onfinality.io/public-ws` | `https://api.subquery.network/sq/subquery/moonbase-alpha-dictionary` |

**您也可以通过事件和调用处理程序来参考 [基本Moonrier EVM 示例项目](https://github.com/subquery/tutorials-moonriver-evm-starter)** 这个项目也存在于 [ SubQuery Explorer](https://explorer.subquery.network/subquery/subquery/moonriver-evm-starter-project) 中。

## 快速入门

1. 添加自定义数据源作为依赖项 `yarn add @subql/contract-processors`
2. 添加自定义数据源，如下文所述。
3. 将自定义数据源的处理程序添加到您的代码

## 数据源说明

| 属性                | 类型                                                             | 必填  | 描述                                         |
| ----------------- | -------------------------------------------------------------- | --- | ------------------------------------------ |
| processor.file    | `'./node_modules/@subql/contract-processors/dist/moonbeam.js'` | Yes | File reference to the data processor code  |
| processor.options | [ProcessorOptions](#processor-options)                         | No  | Options specific to the Moonbeam Processor |
| assets            | `{ [key: String]: { file: String }}`                           | No  | An object of external asset files          |

### 处理器选项：

| 属性      | 类型               | 必填 | 描述                                                                                                         |
| ------- | ---------------- | -- | ---------------------------------------------------------------------------------------------------------- |
| abi     | String           | No | The ABI that is used by the processor to parse arguments. MUST be a key of `assets`                        |
| address | String or `null` | No | A contract address where the event is from or call is made to. `null` will capture contract creation calls |

## MoonbeamCall

使用 [Substrate/CallHandler](../create/mapping/#call-handler) 的同样方式，区别是不同的处理程序参数和较小的过滤更改。

| 属性     | 类型:                          | 必填  | 描述                                          |
| ------ | ---------------------------- | --- | ------------------------------------------- |
| kind   | 'substrate/MoonbeamCall'     | Yes | Specifies that this is an Call type handler |
| filter | [Call Filter](#call-filters) | No  | Filter the data source to execute           |

### 调用过滤器

| 属性       | 类型:    | 示例                                            | 描述                                                                                                                                                                               |
| -------- | ------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| function | String | 0x095ea7b3, approve(address to,uint256 value) | Either [Function Signature](https://docs.ethers.io/v5/api/utils/abi/fragments/#FunctionFragment) strings or the function `sighash` to filter the function called on the contract |
| from     | String | 0x6bd193ee6d2104f14f94e2ca6efefae561a4334b    | An Ethereum address that sent the transaction                                                                                                                                    |

### 处理程序

与正常处理程序不同的是，你不会获得一个 `SubstrateExtrinsic` 作为参数， 相反，您将得到一个 `MoonbeamCall` 基于Ethers [交易响应](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse) 类型。

从 `TransactionResponse` 类型的更改：

- 它没有 `等待` 和 `确认` 属性
- 如果交易成功将会添加一个 `成功` 属性
- 在 `abi` 字段提供参数使其可以成功分析时将会添加`args` 字段

## Moonbeam 事件

使用 [Substrate/CallHandler](../create/mapping/#event-handler) 的同样方式，区别是不同的处理程序参数和较小的过滤更改。

| 属性     | 类型                             | 必填  | 描述                                           |
| ------ | ------------------------------ | --- | -------------------------------------------- |
| kind   | 'substrate/MoonbeamEvent'      | Yes | Specifies that this is an Event type handler |
| filter | [Event Filter](#event-filters) | No  | Filter the data source to execute            |

### Event 过滤器

| 属性     | 类型           | 示例                                                              | 描述                                                                                                                                               |
| ------ | ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| topics | String array | Transfer(address indexed from,address indexed to,uint256 value) | The topics filter follows the Ethereum JSON-PRC log filters, more documentation can be found [here](https://docs.ethers.io/v5/concepts/events/). |

<b>关于主题的说明：</b>
基本日志过滤器有一些改进：

- 主题不需要为 0 padded
- [事件片段](https://docs.ethers.io/v5/api/utils/abi/fragments/#EventFragment) 字符串可以提供并自动转换为他们的 id

### 处理程序

与正常处理程序不同的是，你不会获得一个 `SubstrateExtrinsic` 作为参数， 相反，您将得到一个 `MoonbeamEvent` 基于Ethers [Log](https://docs.ethers.io/v5/api/providers/types/#providers-Log) 类型。

来自 `Log` 类型的更改：

- 在 `abi` 字段提供参数使其可以成功分析时将会添加`args` 字段

## 数据源示例

这是从 `project.yaml` 清单文件中提取出的。

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
              - Transfer(address indexed from,address indexed to,uint256 value)
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

## 已知问题

- 目前无法在处理程序中查询 EVM 状态
- 无法通过调用处理程序来获取交易收据信息
- `blockHash` 属性当前未定义。 `blockNumber` 属性可以改为使用

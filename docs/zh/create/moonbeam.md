# Moonbeam EVM 支持

我们为Moonbeam和Moonriver的EVM提供了一个自定义数据源处理器。 这提供了一种简单的方法来筛选和索引月球网络上的 EVM 和 Substrate 活动在一个单一的 SubQuery 项目中。

支持的网络：

| 网络名称           | Websocket 端点                                       | Dictionary 端点                                                        |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Moonbeam       | _Coming soon_                                      | _Coming soon_                                                        |
| Moonriver      | `wss://moonbeam-alpha.api.onfinality.io/public-ws` | `https://api.subquery.network/sq/subquery/moonriver-dictionary`      |
| Moonbase Alpha | `wss://moonriver.api.onfinality.io/public-ws`      | `https://api.subquery.network/sq/subquery/moonbase-alpha-dictionary` |

**您也可以通过事件和调用处理程序来参考 [基本Moonrier EVM 示例项目](https://github.com/subquery/tutorials-moonriver-evm-starter)** 这个项目也存在于 [ SubQuery Explorer](https://explorer.subquery.network/subquery/subquery/moonriver-evm-starter-project) 中。

## 入门指南

1. 添加自定义数据源作为依赖项 `yarn 添加 @subql/contract-processors`
2. 添加自定义数据源，如下文所述。
3. 将自定义数据源的处理程序添加到您的代码

## Datasource 说明

| Field             | Type                                                           | Required | Description                                |
| ----------------- | -------------------------------------------------------------- | -------- | ------------------------------------------ |
| processor.file    | `'./node_modules/@subql/contract-processors/dist/moonbeam.js'` | Yes      | File reference to the data processor code  |
| processor.options | [ProcessorOptions](#processor-options)                         | No       | Options specific to the Moonbeam Processor |
| assets            | `{ [key: String]: { file: String }}`                           | No       | An object of external asset files          |

### 处理器选项：

| Field   | Type             | Required | Description                          |
| ------- | ---------------- | -------- | ------------------------------------ |
| abi     | String           | No       | 处理器使用的 ABI 解析参数。 MUST 是 `asset的一个密钥` |
| address | String or `null` | No       | 事件发生或呼叫的合同地址。 `null` 将捕获合同创建调用       |

## MoonbeamCall

使用 [Substrate/CallHandler](../create/mapping/#call-handler) 的同样方式，但不同的处理程序参数和较小的过滤更改。

| Field  | Type                         | Required | Description  |
| ------ | ---------------------------- | -------- | ------------ |
| kind   | 'substrate/MoonbeamCall'     | Yes      | 指定这是通话类型处理程序 |
| filter | [Call Filter](#call-filters) | No       | 筛选要执行的数据源    |

### 通话过滤器

| Field    | Type   | Example(s)                                    | Description                                                                                       |
| -------- | ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| function | String | 0x095ea7b3, approve(address to,uint256 value) | [函数签名](https://docs.ethers.io/v5/api/utils/abi/fragments/#FunctionFragment) 字符串或函数 `视野` 过滤被调用的函数。 |
| from     | String | 0x6bd193ee6d2104f14f94e2ca6efefae561a4334b    | 发送交易的 Ethereum 地址                                                                                 |

### 处理程序

与正常处理程序不同的是，你不会获得一个 `SubstrateExtrinsic` 作为参数， 相反，您将得到一个 `月球通话` 基于Ethers [交易响应](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse) 类型。

从 `交易响应` 类型的更改：

- 它没有 `等待` 和 `确认` 属性
- 一个 `成功` 属性被添加到知道交易是否成功
- `args` 是在提供 `abi` 字段且参数可以成功分析时被添加

## Moonbeam 事件

使用 [Substrate/CallHandler](../create/mapping/#event-handler) 的同样方式，但不同的处理程序参数和较小的过滤更改。

| Field  | Type                           | Required | Description  |
| ------ | ------------------------------ | -------- | ------------ |
| kind   | 'substrate/MoonbeamEvent'      | Yes      | 指定这是通话类型处理程序 |
| filter | [Event Filter](#event-filters) | No       | 筛选要执行的数据源    |

### 事件过滤

| Field  | Type         | Example(s)                                                   | Description                                                                               |
| ------ | ------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| topics | String array | Transfer(address indexed from,address indexed to,u256 value) | 主题筛选器遵循Etherum JSON-PRC 日志过滤器，在这里可以找到更多文档 [](https://docs.ethers.io/v5/concepts/events/)。 |

<b>关于主题的说明：</b>
基本日志过滤器有一些改进：

- 主题不需要为 0 padded
- [事件片段](https://docs.ethers.io/v5/api/utils/abi/fragments/#EventFragment) 字符串可以提供并自动转换为他们的 id

### 处理程序

与正常处理程序不同的是，你不会获得一个 `SubstrateExtrinsic` 作为参数， 相反，您将得到一个 `月球通话` 基于Ethers [交易响应](https://docs.ethers.io/v5/api/providers/types/#providers-Log) 类型。

来自 `日志` 类型的更改：

- `args` 是在提供 `abi` 字段且参数可以成功分析时被添加

## 数据源示例

这是从 `project.yaml` 清单文件中提要。

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

## 已知的限制

- 目前无法在处理程序中查询 EVM 状态
- 无法通过通话处理方式获取交易收据信息
- `区块哈希` 属性当前未定义。 `区块编号` 属性可以改为使用

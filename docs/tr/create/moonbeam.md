# Moonbeam EVM Desteği

Moonbeam'in ve Moonriver'ın EVM'si için özel bir veri kaynağı işlemcisi sağlıyoruz. Bu, tek bir SubQuery projesi içinde Moonbeam ağlarındaki hem EVM hem de Substrat etkinliğini filtrelemek ve indekslemek için basit bir yol sunar.

Desteklenen ağlar:

| Ağ Adı         | Websocket Bitim Noktası                            | Sözlük Bitim Noktası                                                 |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Moonbeam       | _Çok yakında_                                      | _Çok yakında_                                                        |
| Moonriver      | `wss://moonriver.api.onfinality.io/public-ws`      | `https://api.subquery.network/sq/subquery/moonriver-dictionary`      |
| Moonbase Alpha | `wss://moonbeam-alpha.api.onfinality.io/public-ws` | `https://api.subquery.network/sq/subquery/moonbase-alpha-dictionary` |

**Ayrıca bir olay ve çağrı işleyici ile
temel Moonriver EVM örnek projesine de başvurabilirsiniz. Bu proje ayrıca burada SubQuery Gezgini'nde canlı olarak barındırılmaktadır.</p> 



## Başlarken

1. Özel veri kaynağını bir bağımlılık olarak ekleyin `yarn @subql/contract-processors` ekleyin
2. Aşağıda açıklandığı gibi özel bir veri kaynağı ekleyin
3. Kodunuza özel veri kaynağı için işleyiciler ekleyin



## Veri Kaynağı Spesifikasyonu

| Alan              | Tip                                                            | Gerekli | Açıklama                               |
| ----------------- | -------------------------------------------------------------- | ------- | -------------------------------------- |
| processor.file    | `'./node_modules/@subql/contract-processors/dist/moonbeam.js'` | Evet    | Veri işlemci koduna dosya referansı    |
| processor.options | [ProcessorOptions](#processor-options)                         | Hayır   | Moonbeam İşlemciye özel seçenekler     |
| varlıklar         | `{ [key: String]: { file: String }}`                           | Hayır   | Harici varlık dosyalarının bir nesnesi |




### İşlemci Seçenekleri

| Alan    | Tip              | Gerekli | Açıklama                                                                                                   |
| ------- | ---------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| abi     | String           | No      | The ABI that is used by the processor to parse arguments. MUST be a key of `assets`                        |
| address | String or `null` | No      | A contract address where the event is from or call is made to. `null` will capture contract creation calls |




## MoonbeamCall

Works in the same way as [substrate/CallHandler](../create/mapping/#call-handler) except with a different handler argument and minor filtering changes.

| Field  | Type                         | Required | Description                                 |
| ------ | ---------------------------- | -------- | ------------------------------------------- |
| kind   | 'substrate/MoonbeamCall'     | Yes      | Specifies that this is an Call type handler |
| filter | [Call Filter](#call-filters) | No       | Filter the data source to execute           |




### Call Filters

| Field    | Type   | Example(s)                                    | Description                                                                                                                                                                      |
| -------- | ------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| function | String | 0x095ea7b3, approve(address to,uint256 value) | Either [Function Signature](https://docs.ethers.io/v5/api/utils/abi/fragments/#FunctionFragment) strings or the function `sighash` to filter the function called on the contract |
| from     | String | 0x6bd193ee6d2104f14f94e2ca6efefae561a4334b    | An Ethereum address that sent the transaction                                                                                                                                    |




### Handlers

Unlike a normal handler you will not get a `SubstrateExtrinsic` as the parameter, instead you will get a `MoonbeamCall` which is based on Ethers [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse) type.

Changes from the `TransactionResponse` type:

- It doesn't have `wait` and `confirmations` properties
- A `success` property is added to know if the transaction was a success
- `args` is added if the `abi` field is provided and the arguments can be successfully parsed



## MoonbeamEvent

Works in the same way as [substrate/EventHandler](../create/mapping/#event-handler) except with a different handler argument and minor filtering changes.

| Field  | Type                           | Required | Description                                  |
| ------ | ------------------------------ | -------- | -------------------------------------------- |
| kind   | 'substrate/MoonbeamEvent'      | Yes      | Specifies that this is an Event type handler |
| filter | [Event Filter](#event-filters) | No       | Filter the data source to execute            |




### Event Filters

| Field  | Type         | Example(s)                                                   | Description                                                                                                                                      |
| ------ | ------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| topics | String array | Transfer(address indexed from,address indexed to,u256 value) | The topics filter follows the Ethereum JSON-PRC log filters, more documentation can be found [here](https://docs.ethers.io/v5/concepts/events/). |

<b>Note on topics:</b>
There are a couple of improvements from basic log filters:

- Topics don't need to be 0 padded
- [Event Fragment](https://docs.ethers.io/v5/api/utils/abi/fragments/#EventFragment) strings can be provided and automatically converted to their id



### Handlers

Unlike a normal handler you will not get a `SubstrateEvent` as the parameter, instead you will get a `MoonbeamEvent` which is based on Ethers [Log](https://docs.ethers.io/v5/api/providers/types/#providers-Log) type.

Changes from the `Log` type:

- `args` is added if the `abi` field is provided and the arguments can be successfully parsed



## Data Source Example

This is an extract from the `project.yaml` manifest file.



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




## Known Limitations

- There is currently no way to query EVM state within a handler
- There is no way to get the transaction receipts with call handlers
- `blockHash` properties are currently left undefined, the `blockNumber` property can be used instead

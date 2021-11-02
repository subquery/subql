# Moonbeam

We provide a custom data source processor for Moonbeam's and Moonriver's EVM. This offers a simple way to filter and index both EVM and Substrate activity on Moonbeam's networks within a single SubQuery project.

Supported networks:

- Moonbeam
- Moonriver
- Moonbase Alpha

## Getting started

1. Add the custom data source as a dependency `yarn add @subql/contract-processors`
2. Add a custom data source as described below
3. Add handlers for the custom data source to your code

**You can also refer to the [basic ERC20 example project](https://github.com/subquery/subql-starter/tree/moonriver-ds) with an event and call handler.**

## Data Source Spec

| Field     |                                 Type                                  | Required |                                                Description                                                 |
| --------- | :-------------------------------------------------------------------: | :------: | :--------------------------------------------------------------------------------------------------------: |
| processor | `{file:'./node_modules/@subql/contract-processors/dist/moonbeam.js'}` |   Yes    |                                 File reference to the data processor code                                  |
| abi       |                                String                                 |    No    |            The ABI that is used by the processor to parse arguments. MUST be a key of `assets`             |
| assets    |                 `{ [key: String]: { file: String }}`                  |    No    |                                     An object of external asset files                                      |
| address   |                           String or `null`                            |    No    | A contract address where the event is from or call is made to. `null` will capture contract creation calls |

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
    # Must be a key of assets
    abi: erc20
    assets:
      erc20:
        file: './erc20.abi.json'

    # Contract address to filter, if `null` should be for contract creation
    address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'
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

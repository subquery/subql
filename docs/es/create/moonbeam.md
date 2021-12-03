# Soporte para EVM de Moonbeam

Proveemos un procesador de fuentes de datos personalizadas para EVM de Moonbeam y Moonriver. Esto ofrece una manera sencilla de filtrar e indexar tanto la actividad EVM como Substrate en las redes de Moonbeam dentro de un único proyecto SubQuery.

Redes soportadas:

| Nombre de la red | Websocket Endpoint                                 | Endpoint del Diccionario                                             |
| ---------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Moonbeam         | _Próximamente_                                     | _Próximamente_                                                       |
| Moonriver        | `wss://moonriver.api.onfinality.io/public-ws`      | `https://api.subquery.network/sq/subquery/moonriver-dictionary`      |
| Moonbase Alpha   | `wss://moonbeam-alpha.api.onfinality.io/public-ws` | `https://api.subquery.network/sq/subquery/moonbase-alpha-dictionary` |

**También puede referirse al [proyecto básico de ejemplo EVM Moonriver](https://github.com/subquery/tutorials-moonriver-evm-starter) con un controlador de eventos y llamadas.** Este proyecto también está alojado en vivo en SubQuery Explorer [aquí](https://explorer.subquery.network/subquery/subquery/moonriver-evm-starter-project).

## Primeros pasos

1. Añadir la fuente de datos personalizada como una dependencia `yarn add @subql/contract-processors`
2. Añadir una fuente de datos personalizada como se describe a continuación
3. Añadir manejadores para la fuente de datos personalizada a tu código

## Data Source Spec

| Field             | Type                                                           | Required | Description                                |
| ----------------- | -------------------------------------------------------------- | -------- | ------------------------------------------ |
| processor.file    | `'./node_modules/@subql/contract-processors/dist/moonbeam.js'` | Yes      | File reference to the data processor code  |
| processor.options | [ProcessorOptions](#processor-options)                         | No       | Options specific to the Moonbeam Processor |
| assets            | `{ [key: String]: { file: String }}`                           | No       | An object of external asset files          |

### Processor Options

| Field   | Type             | Required | Description                                                                                                |
| ------- | ---------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| abi     | String           | No       | The ABI that is used by the processor to parse arguments. MUST be a key of `assets`                        |
| address | String or `null` | No       | A contract address where the event is from or call is made to. `null` will capture contract creation calls |

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
| from     | String | 0x6bd193ee6d2104f14f94e2ca6efefae561a4334b    | Una dirección de Ethereum que envió la transacción                                                                                                                               |

### Manejadores

A diferencia de un manejador normal, no obtendrás un `SubstrateExtrinsic` como el parámetro, en su lugar obtendrás una `MoonbeamCall` que se basa en Ethers [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse) tipo.

Cambios del tipo `TransactionResponse`:

- No tiene propiedades de `esperar` y `confirmar`
- Se añade una propiedad de `éxito` para saber si la transacción fue un éxito
- `args` se añade si se proporciona el campo `abi` y los argumentos pueden ser analizados con éxito

## MoonbeamEvent

Works in the same way as [substrate/EventHandler](../create/mapping/#event-handler) except with a different handler argument and minor filtering changes.

| Field  | Type                           | Required | Description                                  |
| ------ | ------------------------------ | -------- | -------------------------------------------- |
| kind   | 'substrate/MoonbeamEvent'      | Yes      | Specifies that this is an Event type handler |
| filter | [Event Filter](#event-filters) | No       | Filter the data source to execute            |

### Event Filters

| Field  | Type         | Ejemplo(s)                                                      | Description                                                                                                                                      |
| ------ | ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| topics | String array | Transfer(address indexed from,address indexed to,uint256 value) | The topics filter follows the Ethereum JSON-PRC log filters, more documentation can be found [here](https://docs.ethers.io/v5/concepts/events/). |

<b>Note on topics:</b>
There are a couple of improvements from basic log filters:

- Topics don't need to be 0 padded
- [Event Fragment](https://docs.ethers.io/v5/api/utils/abi/fragments/#EventFragment) strings can be provided and automatically converted to their id

### Handlers

Unlike a normal handler you will not get a `SubstrateEvent` as the parameter, instead you will get a `MoonbeamEvent` which is based on Ethers [Log](https://docs.ethers.io/v5/api/providers/types/#providers-Log) type.

Changes from the `Log` type:

- `args` is added if the `abi` field is provided and the arguments can be successfully parsed

## Ejemplo de fuente de datos

Este es un extracto del archivo de manifiesto `project.yaml`.

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

## Limitantes conocidas

- Actualmente no hay forma de consultar el estado EVM dentro de un manejador
- No hay forma de obtener los recibos de transacción con los manejadores de llamadas
- `blockHash` propiedades están actualmente sin definir, la propiedad `blockNumber` puede ser usada en su lugar

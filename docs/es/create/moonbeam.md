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

## Spec de origen de datos

| Campo             | Tipo                                                           | Requerido | Descripción                                             |
| ----------------- | -------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| processor.file    | `'./node_modules/@subql/contract-processors/dist/moonbeam.js'` | Si        | Referencia de archivo al código del procesador de datos |
| processor.options | [ProcessorOptions](#processor-options)                         | No        | Opciones específicas del procesador de Moonbeam         |
| activos           | `{ [key: String]: { file: String }}`                           | No        | Un objeto de archivos de activos externos               |

### Opciones de procesador

| Campo     | Tipo             | Requerido | Descripción                                                                                                                             |
| --------- | ---------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| abi       | String           | No        | El ABI que es usado por el procesador para analizar argumentos. DEBE ser una clave de `activos`                                         |
| dirección | String or `null` | No        | Una dirección de contrato a la que se hace el evento o a la que se hace una llamada. `null` capturará llamadas de creación de contratos |

## MoonbeamCall

Funciona de la misma manera que [substrate/CallHandler](../create/mapping/#call-handler) excepto con un argumento de manejador diferente y cambios menores de filtrado.

| Campo  | Tipo                                | Requerido | Descripción                                         |
| ------ | ----------------------------------- | --------- | --------------------------------------------------- |
| clase  | 'substrate/MoonbeamCall'            | Si        | Especifica que este es un manejador de tipo llamada |
| filtro | [Filtro de llamadas](#call-filters) | No        | Filtrar la fuente de datos para ejecutar            |

### Filtro de llamadas

| Campo   | Tipo   | Ejemplo(s)                                    | Descripción                                                                                                                                                           |
| ------- | ------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| función | String | 0x095ea7b3, approve(address to,uint256 value) | [Firma de función](https://docs.ethers.io/v5/api/utils/abi/fragments/#FunctionFragment) cadenas o la función `sighash` para filtrar la función llamada en el contrato |
| de      | String | 0x6bd193ee6d2104f14f94e2ca6efefae561a4334b    | Una dirección de Ethereum que envió la transacción                                                                                                                    |

### Manejadores

A diferencia de un manejador normal, no obtendrás un `SubstrateExtrinsic` como el parámetro, en su lugar obtendrás una `MoonbeamCall` que se basa en Ethers [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse) tipo.

Cambios del tipo `TransactionResponse`:

- No tiene propiedades de `esperar` y `confirmar`
- Se añade una propiedad de `éxito` para saber si la transacción fue un éxito
- `args` se añade si se proporciona el campo `abi` y los argumentos pueden ser analizados con éxito

## MoonbeamEvent

Funciona de la misma manera que [substrate/EventHandler](../create/mapping/#event-handler) excepto con un argumento de manejador diferente y cambios menores de filtrados.

| Campo  | Tipo                                | Requerido | Descripción                                           |
| ------ | ----------------------------------- | --------- | ----------------------------------------------------- |
| clase  | 'substrate/MoonbeamEvent'           | Si        | Especifica que este es un manejador de tipo de evento |
| filtro | [Filtro de eventos](#event-filters) | No        | Filtrar la fuente de datos para ejecutar              |

### Filtros de eventos

| Campo | Tipo                  | Ejemplo(s)                                                                | Descripción                                                                                                                                                     |
| ----- | --------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| temas | Arreglo de secuencias | Transferencia (índice de dirección de,dirección indexada a,valor uint256) | El filtro de temas sigue los filtros de registro JSON-PRC de Ethereum, se puede encontrar más documentación [aquí](https://docs.ethers.io/v5/concepts/events/). |

<b>Nota sobre temas:</b>
Hay un par de mejoras en los filtros básicos de registro:

- Los temas no necesitan ser acolchados 0
- [Se pueden proporcionar fragmentos de eventos](https://docs.ethers.io/v5/api/utils/abi/fragments/#EventFragment) y convertir automáticamente a su id

### Manejadores

A diferencia de un manejador normal, no obtendrá un `SubstrateEvent` como parámetro, en su lugar obtendrás un `MoonbeamEvent` que se basa en Ethers [tipo Log](https://docs.ethers.io/v5/api/providers/types/#providers-Log).

Cambios de tipo `Log`:

- `args` se añade si se proporciona el campo `abi` y los argumentos pueden ser analizados con éxito

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

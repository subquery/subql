# Файл манифеста

Манифест файл `project. aml`можно рассматривать как входную точку вашего проекта, и он определяет большую часть деталей о том, как SubQuery будет индексировать и преобразовывать данные цепочки.

Манифест может быть в формате YAML или JSON. В этом документе мы будем использовать YAML во всех примерах. Ниже приведен стандартный пример базового `project.yaml`.

``` yml
specVersion: "0.0.1"
description: ""
repository: "https://github.com/subquery/subql-starter"

schema: "./schema.graphql"

network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"
  # Optionally provide the HTTP endpoint of a full chain dictionary to speed up processing
  dictionary: "https://api.subquery.network/sq/subquery/dictionary-polkadot"

dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
        - handler: handleEvent
          kind: substrate/EventHandler
          filter: #Filter is optional but suggested to speed up event processing
            module: balances
            method: Deposit
        - handler: handleCall
          kind: substrate/CallHandler
```

- `network. \endpoint` определяет конечную точку wss или ws для индексирования блокчейна - **Это должен быть полный архивный узел**.
- `network.dictionary` при необходимости предоставляет HTTP конечную точку полного словаря для ускорения обработки - см. [Running an Indexer](../run/run.md#using-a-dictionary)
- `dataSources` определяет данные, которые будут отфильтрованы и извлечены, а также расположение обработчика карты для применения преобразования данных.
  - `kind` поддерживает только `substrate/Runtime` сейчас.
  - `startBlock` указывает высоту блока для начала индексации.
  - `filter` фильтрует источник данных для выполнения по сетевому имени спецификации конечной точки, см. [сетевые фильтры](#network-filters)
  - `mapping.handlers` выведет список всех [mapping functions](./mapping.md) и соответствующих типов обработчиков, с дополнительными [mapping filters](#mapping-filters).

## Сетевые Фильтры

Обычно пользователь создаст SubQuery и будет повторно использовать его как для тестнетов, так и для майннет среды(например, Polkadot и Kusama). Между сетями различные опции, вероятно, отличаются (например, стартовый блок индекса). Поэтому мы позволяем пользователям определять различные детали для каждого источника данных, что означает, что один проект SubQuery по-прежнему может использоваться в нескольких сетях.

Пользователи могут добавить `filter` на `dataSources` для решения о том, какой источник данных запускать в каждой сети.

Ниже приведен пример, который показывает различные источники данных как для Polkadot так и для Kusama.

```yaml
...
network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"

#Create a template to avoid redundancy
definitions:
  mapping: &mymapping
    handlers:
      - handler: handleBlock
        kind: substrate/BlockHandler

dataSources:
  - name: polkadotRuntime
    kind: substrate/Runtime
    filter:  #Optional
        specName: polkadot
    startBlock: 1000
    mapping: *mymapping #use template here
  - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapping: *mymapping # can reuse or change
```

## Фильтры сопоставления

Фильтры сопоставления являются чрезвычайно полезной функцией, чтобы решить, что блок, событие или надпись вызовут обработчик сопоставления.

Только входящие данные, удовлетворяющие условия фильтра, будут обрабатываться функциями сопоставления. Фильтры сопоставления являются необязательными, но рекомендуются, поскольку они значительно уменьшают объем данных, обрабатываемых вашим проектом SubQuery и повышают производительность индексации.

```yaml
#Пример фильтра из callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

В следующей таблице описываются фильтры поддерживаемые различными обработчиками.

| Handler                                         | Поддерживаемый фильтр        |
| ----------------------------------------------- | ---------------------------- |
| [Обработчик блоков](./mapping.md#block-handler) | `специализация`              |
| [EventHandler](./mapping.md#event-handler)      | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)        | `module`,`method` ,`success` |


-  Фильтры модулей и методов поддерживаются в любой блокчейн цепи, построенной на Substrate.
- `success` фильтр принимает логическое значение и может быть использован для фильтрации дополнительных по его статусу успеха.
- `specVersion` определяет диапазон версии спецификации для блока substrate. Следующие примеры описывают, как установить диапазон версий.

```yaml
filter:
  specVersion: [23, 24] #Index блок с specVersion в диапазоне от 23 до 24 (включительно).
  specVersion: [100]      #Index блок со спецификацией больше или равно 100.
  specVersion: [null, 23] #Индекс блок со специализацией равной или менее 23.
```

## Пользовательские цепочки

Вы можете проиндексировать данные из пользовательских цепей, включив в `project.yaml`. Объявить конкретные типы, поддерживаемые блокчейном в `network.types`. Мы поддерживаем дополнительные типы, используемые модулями выполнения substrate.

Также поддерживаются `typesAlias`, `typesBundle`, `typesChain`, и `typesSpec`.

``` yml
specVersion: "0.0.1"
description: "This subquery indexes kitty's birth info"
repository: "https://github.com/onfinality-io/subql-examples"
schema: "./schema.graphql"
network:
  endpoint: "ws://host.kittychain. o/public-ws"
  типы: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]"
  }
# typesChain: { chain: { Type5: 'example' } }
# typesSpec: { spec: { Type6: 'example' } }
dataSources:
  - name: runtime
    kind: substrate/Runtime
    startBlock: 1
    filter: #Optional
      specName: kitty-chain 
    mapping:
      handlers:
        - handleKittyBred
          kind: substrate/CallHandler
          filter:
            module: kitties
            method: breed
            success: true
```

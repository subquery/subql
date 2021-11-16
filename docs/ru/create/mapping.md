# Сопоставление

Функции сопоставления определяют, как данные цепи преобразуются в оптимизированные GraphQL-сущности, которые мы ранее определили в файле `schema.graphql`.

- Сопоставления определяются в директории `src/mapappings` и экспортируются как функция
- Эти сопоставления также экспортированы в `src/index.ts`
- Файлы сопоставлений являются ссылками в `project.yaml` под обработчиками сопоставлений.

There are three classes of mappings functions; [Block handlers](#block-handler), [Event Handlers](#event-handler), and [Call Handlers](#call-handler).

## Обработчик блоков

You can use block handlers to capture information each time a new block is attached to the Substrate chain, e.g. block number. To achieve this, a defined BlockHandler will be called once for every block.

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

A [SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) is an extended interface type of [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/), but also includes the `specVersion` and `timestamp`.

## Обработчик событий

You can use event handlers to capture information when certain events are included on a new block. The events that are part of the default Substrate runtime and a block may contain multiple events.

During the processing, the event handler will receive a substrate event as an argument with the event's typed inputs and outputs. Any type of event will trigger the mapping, allowing activity with the data source to be captured. You should use [Mapping Filters](./manifest.md#mapping-filters) in your manifest to filter events to reduce the time it takes to index data and improve mapping performance.

```ts
импортировать {SubstrateEvent} из "@subql/types";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, balance]}} = event;
    // Получение записи по ее ID
    const запись = new starterEntity(event). xtrinsic.block.block.header.hash.toString());
    record.field2 = account. oString();
    record.field3 = (баланс как баланс).toBigInt();
    ожидание record.save();
```

A [SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) is an extended interface type of the [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Besides the event data, it also includes an `id` (the block to which this event belongs) and the extrinsic inside of this block.

## Обработчик вызовов

Call handlers are used when you want to capture information on certain substrate extrinsics.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

The [SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) extends [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). It is assigned an `id` (the block to which this extrinsic belongs) and provides an extrinsic property that extends the events among this block. Additionally, it records the success status of this extrinsic.

## Состояния запроса
Our goal is to cover all data sources for users for mapping handlers (more than just the three interface event types above). Therefore, we have exposed some of the @polkadot/api interfaces to increase capabilities.

These are the interfaces we currently support:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) будет запрашивать <strong>current</strong> блок.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) сделает несколько запросов типа <strong>same</strong> в текущем блоке.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) сделает несколько запросов <strong>разных типов</strong> в текущем блоке.

These are the interfaces we do **NOT** support currently:
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

See an example of using this API in our [validator-threshold](https://github.com/subquery/tutorials-validator-threshold) example use case.

## RPC-вызовы

We also support some API RPC methods that are remote calls that allow the mapping function to interact with the actual node, query, and submission. A core premise of SubQuery is that it's deterministic, and therefore, to keep the results consistent we only allow historical RPC calls.

Documents in [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) provide some methods that take `BlockHash` as an input parameter (e.g. `at?: BlockHash`), which are now permitted. We have also modified these methods to take the current indexing block hash by default.

```typescript
// Скажем, мы сейчас индексируем блок с этим хэшем номером
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d064871148e9d41ef086f6a`;

// Оригинальный метод имеет необязательный входной блок хэш
const b1 = ожидание api. pc.chain.getBlock(blockhash);

// Он будет использовать текущий блок по умолчанию так:
const b2 = await api.rpc.chain.getBlock();
```
- Для [Custom Substrate Chains](#custom-substrate-chains) RPC звонки смотрите [usage](#usage).

## Модули и Библиотеки

To improve SubQuery's data processing capabilities, we have allowed some of the NodeJS's built-in modules for running mapping functions in the [sandbox](#the-sandbox), and have allowed users to call third-party libraries.

Please note this is an **experimental feature** and you may encounter bugs or issues that may negatively impact your mapping functions. Please report any bugs you find by creating an issue in [GitHub](https://github.com/subquery/subql).

### Встроенные модули

Currently, we allow the following NodeJS modules: `assert`, `buffer`, `crypto`, `util`, and `path`.

Rather than importing the whole module, we recommend only importing the required method(s) that you need. Some methods in these modules may have dependencies that are unsupported and will fail on import.

```ts
импортировать {hashMessage} из "ethers/lib/utils"; //Хороший способ
импорта {utils} из "ethers" //Некорректный

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic. lock.block.header.hash.toString());
    record.field1 = hashMessage('Hello');
    ожидание записи.save();
}
```

### Сторонние библиотеки

Due to the limitations of the virtual machine in our sandbox, currently, we only support third-party libraries written by **CommonJS**.

We also support a **hybrid** library like `@polkadot/*` that uses ESM as default. However, if any other libraries depend on any modules in **ESM** format, the virtual machine will **NOT** compile and return an error.

## Кастомные Substrate цепи

SubQuery can be used on any Substrate-based chain, not just Polkadot or Kusama.

You can use a custom Substrate-based chain and we provide tools to import types, interfaces, and additional methods automatically using [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

In the following sections, we use our [kitty example](https://github.com/subquery/tutorials-kitty-chain) to explain the integration process.

### Подготовка

Create a new directory `api-interfaces` under the project `src` folder to store all required and generated files. We also create an `api-interfaces/kitties` directory as we want to add decoration in the API from the `kitties` module.

#### Метаданные

We need metadata to generate the actual API endpoints. In the kitty example, we use an endpoint from a local testnet, and it provides additional types. Follow the steps in [PolkadotJS metadata setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) to retrieve a node's metadata from its **HTTP** endpoint.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
or from its **websocket** endpoint with help from [`websocat`](https://github.com/vi/websocat):

```shell
//Установить websocat
brew install websocat

//Получить метаданные
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Next, copy and paste the output to a JSON file. In our [kitty example](https://github.com/subquery/tutorials-kitty-chain), we have created `api-interface/kitty.json`.

#### Определения типов
We assume that the user knows the specific types and RPC support from the chain, and it is defined in the [Manifest](./manifest.md).

Following [types setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), we create :
- `src/api-interfaces/definitions.ts` - экспортирует все определения подпапок

```ts
экспортировать { default as kitties } из './kitties/definitions';
```

- `src/api-interfaces/kitties/definitions.ts` - определения типа для модуля котят
```ts
экспорт по умолчанию {
    // пользовательские типы
    : {
        Адрес: "AccountId",
        Справка: "ID клиента",
        KittyIndex: "u32",
        Kitty: "[u8; 16]"
    },
    // custom rpc : api. pc.kitties. etKittyPrice
    rpc: {
        getKittyPrice:{
            description: 'Get Kitty price',
            параметр: [
                {name: 'at', тип: 'BlockHash', История: правда, необязательно: false}, {name: 'kittyIndex', тип: 'KittyIndex', необязательно: ложно}], type: 'Баланс'}}}
```

#### Пакеты

- В пакете `. son` файл, не забудьте добавить `@polkadot/typegen` в качестве зависимостей для разработки и `@polkadot/api` как обычную зависимость (в идеале ту же версию). Нам также нужно `ts-node` в качестве зависимости для разработки, чтобы помочь нам запустить скрипты.
- Мы добавляем скрипты для запуска обоих типов; `generate:defs` и метаданных `generate:meta` generators (в таком порядке, чтобы метаданные могли использовать типы).

Here is a simplified version of `package.json`. Make sure in the **scripts** section the package name is correct and the directories are valid.

```json
{
  "name": "kitty-birthinfo",
  "scripts": {
    "generate:defs": "ts-node --skip-project node_modules/.bin/polkadot-types-from-defs --package kitty-birthinfo/api-interfaces --input . src/api-interfaces",
    "generate:meta": "ts-node --skip-project node_modules/.bin/polkadot-types-from-chain --package kitty-birthinfo/api-interfaces --endpoint . src/api-interfaces/kitty.json --output ./src/api-interfaces --strict"
  },
  "dependencies": {
    "@polkadot/api": "^4.9. "
  },
  "devDependencies": {
    "typescript": "^4.1. ",
    "@polkadot/typegen": "^4.9.2",
    "ts-node": "^8.6.2"
  }
}
```

### Генерация типов

Now that preparation is completed, we are ready to generate types and metadata. Run the commands below:

```shell
# Для установки новых зависимостей
yarn

# Генерировать типы
yarn generate:defs
```

In each modules folder (eg `/kitties`), there should now be a generated `types.ts` that defines all interfaces from this modules' definitions, also a file `index.ts` that exports them all.

```shell
# Сгенерировать метаданные
yarn generate:meta
```

This command will generate the metadata and a new api-augment for the APIs. As we don't want to use the built-in API, we will need to replace them by adding an explicit override in our `tsconfig.json`. After the updates, the paths in the config will look like this (without the comments):

```json
{
  "compilerOptions": {
      // это имя пакета, которое мы используем (в импорте интерфейса, --пакет для генераторов)*/
      "Информация о рождении/*": ["src/*"],
      // здесь мы заменим добавление @polkadot/api своим генерируется из цепи
      "@polkadot/api/augment": ["src/interfaces/augment-api. s"],
      // заменить дополненные типы собственными, в соответствии с определениями
      "@polkadot/types/augment": ["src/interfaces/augment-types.
```

### Использование

Now in the mapping function, we can show how the metadata and types actually decorate the API. The RPC endpoint will support the modules and methods we declared above. And to use custom rpc call, please see section [Custom chain rpc calls](#custom-chain-rpc-calls)
```typescript
export async function kittyApiHandler(): Promise<void> {
    //return the KittyIndex type
    const nextKittyId = await api. веер. itties. extKittyId();
    // возвращаем тип Kitty, тип входных параметров: AccountId и KittyIndex
    const allKitties = await api. uery.kitties.kitties('xxxxxxx',123)
    logger. nfo(`Следующий id котика ${nextKittyId}`)
    //Другой rpc, установка не определена для blockhash
    const kittyPrice = ожидание api. pc.kitties.getKittyPrice(неизвестно, nextKittyId);
}
```

**If you wish to publish this project to our explorer, please include the generated files in `src/api-interfaces`.**

### Пользовательские вызовы в цепочке rpc

To support customised chain RPC calls, we must manually inject RPC definitions for `typesBundle`, allowing per-spec configuration. You can define the `typesBundle` in the `project.yml`. And please remember only `isHistoric` type of calls are supported.
```yaml
...
  типы: {
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
                параметров: [
                  {name: 'at', тип: 'BlockHash', История: правда, необязательно: false}, {name: 'kittyIndex', тип: 'KittyIndex', необязательно: ложно}], тип: "Баланс", }}}}

```

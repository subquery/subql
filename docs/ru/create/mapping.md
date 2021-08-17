# Сопоставление

Функции сопоставления определяют, как данные цепи преобразуются в оптимизированные GraphQL-сущности, которые мы ранее определили в файле `schema.graphql`.

Сопоставления написаны в подгруппе TypeScript называется AssemblyScript, который может быть скомпилирован в WASM (WebAssembly).
- Сопоставления определяются в директории `src/mapappings` и экспортируются как функция
- Эти сопоставления также экспортированы в `src/index.ts`
- Файлы сопоставлений являются ссылками в `project.yaml` под обработчиками сопоставлений.

Существует три класса функций сопоставления;  [Block handlers](#block-handler), [Event Handlers](#event-handler), и [Call Handlers](#call-handler).

## Обработчик блоков

Вы можете использовать обработчики блоков для создания информации каждый раз, когда новый блок прикрепляется к цепочке Substrate, например номер блока. Для достижения этой цели, определенный BlockHandler будет вызываться один раз для каждого блока.

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

[SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) является расширенным интерфейсом типа [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/), но также включает в себя `specVersion` и `timestamp`.

## Обработчик событий

Вы можете использовать обработчики событий для сбора информации, когда определенные события включены в новый блок. События, входящие в стандартное время выполнения Substrate, и блок могут содержать несколько событий.

Во время обработки события в качестве аргумента с напечатанными входами и выходами, обработчик событий будет получать подстрочное событие. Любой тип события запустит сопоставление, позволяя активность с источником данных для захвата. Вы должны использовать [Mapping Filters](./manifest.md#mapping-filters) в вашем манифесте для фильтрации событий, чтобы сократить время, необходимое для индексирования данных и улучшения производительности сопоставления.

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

[SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) является расширенным интерфейсом типа [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Помимо данных события, он также включает в себя `id` (блок к которому принадлежит это событие) и дополнительным внутри этого блока.

## Обработчик вызовов

Обработчики вызовов используются, когда вы хотите запечатлеть информацию о некоторых substrate extrinsics.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

[SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) расширяет [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). Назначенный `id` (блок, к которому принадлежит), и предоставляет дополнительное свойство, которое расширяет события среди этого блока. Кроме того, он регистрирует успешный статус этой надбавки.

## Состояния запроса
Наша цель - охватить все источники данных для пользователей для сопоставления обработчиков (более чем три типа событий интерфейса выше). Поэтому мы выставили некоторые из интерфейсов @polkadot/api для увеличения возможностей.

Это интерфейсы, которые мы поддерживаем в настоящее время:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) будет запрашивать <strong>current</strong> блок.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) сделает несколько запросов типа <strong>same</strong> в текущем блоке.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) сделает несколько запросов <strong>разных типов</strong> в текущем блоке.

Это интерфейсы, которые мы **НЕ** поддерживаем сейчас:
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

Смотрите пример использования этого API в нашем [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold) варианте использования.

## RPC-вызовы

Мы также поддерживаем некоторые методы API RPC, которые являются удалёнными вызовами, которые позволяют функции сопоставления взаимодействовать с реальным узлом, запросом и отправкой. Основной предпосылкой подзапроса является то, что он детерминирует и, следовательно, держать последовательные результаты мы разрешаем только исторические RPC-вызовы.

Документы в [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) предоставляют некоторые методы, которые используют `BlockHash` в качестве входного параметра (e. . `в?: BlockHash`), которые теперь разрешены. Мы также изменили эти методы, чтобы получить по умолчанию хэш текущего блока индексации.

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

Для улучшения возможностей обработки данных SubQuery, мы разрешили некоторые встроенные модули NodeJS для запущенных функций сопоставления в [песочнице](#the-sandbox), и разрешили пользователям звонить в сторонние библиотеки.

Пожалуйста, обратите внимание, что это **экспериментальная функция** и вы можете столкнуться с ошибками или проблемами, которые могут негативно повлиять на ваши функции сопоставления. Please report any bugs you find by creating an issue in [GitHub](https://github.com/subquery/subql).

### Built-in modules

Currently, we allow the following NodeJS modules: `assert`, `buffer`, `crypto`, `util`, and `path`.

Rather than importing the whole module, we recommend only importing the required method(s) that you need. Some methods in these modules may have dependencies that are unsupported and will fail on import.

```ts
import {hashMessage} from "ethers/lib/utils"; //Good way
import {utils} from "ethers" //Bad way

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field1 = hashMessage('Hello');
    await record.save();
}
```

### Third-party libraries

Due to the limitations of the virtual machine in our sandbox, currently, we only support third-party libraries written by **CommonJS**.

We also support a **hybrid** library like `@polkadot/*` that uses ESM as default. However, if any other libraries depend on any modules in **ESM** format, the virtual machine will **NOT** compile and return an error.

## Custom Substrate Chains

SubQuery can be used on any Substrate-based chain, not just Polkadot or Kusama.

You can use a custom Substrate-based chain and we provide tools to import types, interfaces, and additional methods automatically using [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

In the following sections, we use our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty) to explain the integration process.

### Preparation

Create a new directory `api-interfaces` under the project `src` folder to store all required and generated files. We also create an `api-interfaces/kitties` directory as we want to add decoration in the API from the `kitties` module.

#### Metadata

We need metadata to generate the actual API endpoints. In the kitty example, we use an endpoint from a local testnet, and it provides additional types. Follow the steps in [PolkadotJS metadata setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) to retrieve a node's metadata from its **HTTP** endpoint.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
or from its **websocket** endpoint with help from [`websocat`](https://github.com/vi/websocat):

```shell
//Install the websocat
brew install websocat

//Get metadata
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Next, copy and paste the output to a JSON file. In our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty), we have created `api-interface/kitty.json`.

#### Type definitions
We assume that the user knows the specific types and RPC support from the chain, and it is defined in the [Manifest](./manifest.md).

Following [types setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), we create :
- `src/api-interfaces/definitions.ts` - this exports all the sub-folder definitions

```ts
export { default as kitties } from './kitties/definitions';
```

- `src/api-interfaces/kitties/definitions.ts` - type definitions for the kitties module
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

#### Packages

- In the `package.json` file, make sure to add `@polkadot/typegen` as a development dependency and `@polkadot/api` as a regular dependency (ideally the same version). We also need `ts-node` as a development dependency to help us run the scripts.
- We add scripts to run both types; `generate:defs` and metadata `generate:meta` generators (in that order, so metadata can use the types).

Here is a simplified version of `package.json`. Make sure in the **scripts** section the package name is correct and the directories are valid.

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

### Type generation

Now that preparation is completed, we are ready to generate types and metadata. Run the commands below:

```shell
# Yarn to install new dependencies
yarn

# Generate types
yarn generate:defs
```

In each modules folder (eg `/kitties`), there should now be a generated `types.ts` that defines all interfaces from this modules' definitions, also a file `index.ts` that exports them all.

```shell
# Generate metadata
yarn generate:meta
```

This command will generate the metadata and a new api-augment for the APIs. As we don't want to use the built-in API, we will need to replace them by adding an explicit override in our `tsconfig.json`. After the updates, the paths in the config will look like this (without the comments):

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

### Usage

Now in the mapping function, we can show how the metadata and types actually decorate the API. The RPC endpoint will support the modules and methods we declared above. And to use custom rpc call, please see section [Custom chain rpc calls](#custom-chain-rpc-calls)
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

**If you wish to publish this project to our explorer, please include the generated files in `src/api-interfaces`.**

### Custom chain rpc calls

To support customised chain RPC calls, we must manually inject RPC definitions for `typesBundle`, allowing per-spec configuration. You can define the `typesBundle` in the `project.yml`. And please remember only `isHistoric` type of calls are supported.
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

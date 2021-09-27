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

Во время обработки события в качестве аргумента с напечатанными входами и выходами, обработчик событий будет получать подстрочное событие. Любой тип события запускает сопоставление, позволяя фиксировать действия с источником данных. Вы должны использовать [Mapping Filters](./manifest.md#mapping-filters) в вашем манифесте для фильтрации событий, чтобы сократить время, необходимое для индексирования данных и улучшения производительности сопоставления.

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

Пожалуйста, обратите внимание, что это **экспериментальная функция** и вы можете столкнуться с ошибками или проблемами, которые могут негативно повлиять на ваши функции сопоставления. Пожалуйста, сообщите о любых ошибках, создав вопрос в [GitHub](https://github.com/subquery/subql).

### Встроенные модули

В настоящее время мы разрешаем следующие модули NodeJS:`assert`, `buffer`, `crypto`, `util`, and `path`.

Вместо того, чтобы импортировать весь модуль, мы рекомендуем импортировать только нужный метод(ы). Некоторые методы в этих модулях могут иметь неподдерживаемые зависимости и не будут выполнены при импорте.

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

Из-за ограничений виртуальной машины в песочнице мы поддерживаем только сторонние библиотеки, написанные **CommonJS**.

Мы также поддерживаем **гибридную библиотеку** , такую как `@polkadot/*` , использующую ESM по умолчанию. Однако, если другие библиотеки зависят от модулей в формате **ESM** , виртуальная машина **НЕ** компилирует и возвращает ошибку.

## Кастомные Substrate цепи

Subquery может быть использован не только в Polkadot или Kusama.

Вы можете использовать кастомную Substrate цепь, и мы предоставляем инструменты для импорта типов, интерфейсов и дополнительных методов, автоматически используя [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

В следующих разделах мы используем наш [набор](https://github.com/subquery/subql-examples/tree/main/kitty) для объяснения процесса интеграции.

### Подготовка

Создайте новый каталог `api-интерфейсов` в папке проекта `src` для хранения всех необходимых и сгенерированных файлов. Мы также создаем каталог `api-interfaces/kitties` , так как хотим добавить декорирование в API из модуля `наборов`.

#### Метаданные

Нам нужны метаданные для создания реальных конечных точек API. В примере c котятами мы используем конечную точку из локальной тестовой сети, и она предоставляет дополнительные типы. Выполните шаги в [настройках метаданных PolkadotJS](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) , чтобы получить метаданные узла из конечной точки **HTTP**.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
или из его **веб-сокета** с помощью [`websocet`](https://github.com/vi/websocat):

```shell
//Установить websocat
brew install websocat

//Получить метаданные
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Далее скопируйте и вставьте вывод в файл JSON. В нашем [примере c котятами](https://github.com/subquery/subql-examples/tree/main/kitty), мы создали `api-interface/kitty.json`.

#### Определения типов
Мы предполагаем, что пользователь знает конкретные типы и поддержку RPC из цепочки, и она определена в [Манифесте](./manifest.md).

Следующие [типа установки](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), мы создаем :
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

Вот упрощённая версия `package.json`. Убедитесь, что в разделе **скрипты** имя пакета верно, и каталоги верны.

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

Теперь, когда подготовка завершена, мы готовы генерировать типы и метаданные. Выполните следующие команды:

```shell
# Для установки новых зависимостей
yarn

# Генерировать типы
yarn generate:defs
```

В каждой папке модулей (например, ` / kitties `) теперь должен быть сгенерированный ` types.ts `, который определяет все интерфейсы из определений этих модулей, а также файл ` index.ts `, который их все экспортирует.

```shell
# Сгенерировать метаданные
yarn generate:meta
```

Эта команда сгенерирует метаданные и новые api-дополнения к API. Поскольку мы не хотим использовать встроенный API, нам нужно будет заменить их, добавив явное переопределение в нашем `tsconfig. сын`. После обновления пути в конфигурации будут выглядеть следующим образом (без комментариев):

```json
{
  "compilerOptions": {
      // это имя пакета, которое мы используем (в импорте интерфейса, --пакет для генераторов)*/
      "Информация о рождении/*": ["src/*"],
      // здесь мы заменим добавление @polkadot/api своим генерируется из цепи
      "@polkadot/api/augment": ["src/interfaces/augment-api. s"],
      // заменить дополненные типы собственными, в соответствии с определениями
      "@polkadot/types/augment": ["src/interfaces/augment-types. s"]
    }
}
```

### Использование

Теперь в функции сопоставления, мы можем показать, как метаданные и типы на самом деле украшают API. Конечная точка RPC будет поддерживать модули и методы, описанные выше. Для использования пользовательского вызова rpc см. раздел [Пользовательские вызовы rpc цепи](#custom-chain-rpc-calls)
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

**Если вы хотите опубликовать этот проект нашему исследователю, пожалуйста, включите сгенерированные файлы в `src/api-интерфейсы`.**

### Пользовательские вызовы в цепочке rpc

Для поддержки пользовательских вызовов в цепочке RPC мы должны вручную вставить определения RPC для `typesBundle`, что позволяет конфигурацию для каждой точки. Вы можете определить ` typesBundle ` в ` project.yml `. И пожалуйста, помните только `isHistoric` тип звонков поддерживается.
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

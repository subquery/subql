# Hello World (локальный хост + докер)

Добро пожаловать в краткое руководство по SubQuery Hello World. Краткое руководство призвано показать вам, как запустить стартовый проект по умолчанию в Docker за несколько простых шагов.

## Цели обучения

В конце этого краткого руководства вам следует:

- понимать необходимые предварительные условия
- понимать основные стандартные команды
- иметь возможность перейти на localhost: 3000 и просмотреть игровую площадку
- запустить простой запрос, чтобы получить высоту блока основной сети Polkadot

## Целевая аудитория

Это руководство предназначено для новых разработчиков, имеющих некоторый опыт разработки и заинтересованных в получении дополнительных сведений о SubQuery.

## Видео инструкция

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/j034cyUYb7k" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Предпосылки

Вам понадобится:

- yarn или npm менеджер пакетов
- SubQuery CLI (`@subql/cli`)
- Докер

Вы можете запустить следующие команды в терминале, чтобы узнать, есть ли у вас какие-либо из этих предварительных условий.

```shell
yarn -v (or npm -v)
subql -v
docker -v
```

Для более опытных пользователей скопируйте и вставьте следующее:

```shell
echo -e "My yarn version is:" `yarn -v` "\nMy subql version is:" `subql -v`  "\nMy docker version is:" `docker -v`
```

Это должно вернуть: (для пользователей npm замените yarn на npm)

```shell
Моя версия yarn: 1.22.10
Моя версия subql: @subql/cli/0.9.3 darwin-x64 node-v16.3.0
Моя версия docker: Docker version 20.10.5, build 55c4c88
```

Если вы получите вышеуказанное, то все в порядке. В противном случае перейдите по этим ссылкам, чтобы установить их:

- [yarn](https://classic.yarnpkg.com/en/docs/install/) or [npm](https://www.npmjs.com/get-npm)
- [SubQuery CLI](quickstart.md#install-the-subquery-cli)
- [Docker](https://docs.docker.com/get-docker/)

## 1. Step 1: Initialise project

Первым шагом при запуске с SubQuery является выполнение команды ` subql init `. Давайте инициализируем стартовый проект с именем ` subqlHelloWorld `. Обратите внимание, что только автор является обязательным. Все остальное внизу остается пустым.

```shell
> subql init --starter subqlHelloWorld
Git repository:
RPC endpoint [wss://polkadot.api.onfinality.io/public-ws]:
Authors: sa
Description:
Version: [1.0.0]:
License: [Apache-2.0]:
Init the starter package... subqlHelloWorld is ready

```

Не забудьте перейти в новый каталог.

```shell
cd subqlHelloWorld
```

## 2. Step 2: Install dependencies

Теперь выполните установку yarn или node, чтобы установить различные зависимости.

<CodeGroup> # Yarn yarn install # NPM npm install

```shell
> yarn install
yarn install v1.22.10
info No lockfile found.
[1/4] 🔍  Resolving packages...
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
[4/4] 🔨  Building fresh packages...
success Saved lockfile.
✨  Done in 31.84s.
```

## 3. Step 3: Generate code

Теперь запустите ` yarn codegen `, чтобы сгенерировать Typescript из схемы GraphQL.

<CodeGroup> # Yarn yarn codegen # NPM npm run-script codegen

```shell
> yarn codegen
yarn run v1.22.10
$ ./node_modules/.bin/subql codegen
===============================
---------Subql Codegen---------
===============================
* Schema StarterEntity generated !
* Models index generated !
* Types index generated!
✨  Done in 1.02s.
```

** Предупреждение ** При внесении изменений в файл схемы, пожалуйста, не забудьте повторно запустить ` yarn codegen `, чтобы заново сгенерировать каталог типов.

## 4. Step 4: Build code

Следующим шагом является создание кода с помощью ` yarn build `.

<CodeGroup> # Yarn yarn build # NPM npm run-script build

```shell
> yarn build
yarn run v1.22.10
$ tsc -b
✨  Done in 5.68s.
```

## 5. Запустите Docker

Использование Docker позволяет очень быстро запустить этот пример, поскольку вся необходимая инфраструктура может быть предоставлена в образе Docker. Run `docker-compose pull && docker-compose up`.

Это запустит все заново и в конечном итоге вы получите извлекаемые блоки.

```shell
> #SNIPPET
subquery-node_1   | 2021-06-05T22:20:31.450Z <subql-node> INFO node started
subquery-node_1   | 2021-06-05T22:20:35.134Z <fetch> INFO fetch block [1, 100]
subqlhelloworld_graphql-engine_1 exited with code 0
subquery-node_1   | 2021-06-05T22:20:38.412Z <fetch> INFO fetch block [101, 200]
graphql-engine_1  | 2021-06-05T22:20:39.353Z <nestjs> INFO Starting Nest application...
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO AppModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO ConfigureModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.383Z <nestjs> INFO GraphqlModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.809Z <nestjs> INFO Nest application successfully started
subquery-node_1   | 2021-06-05T22:20:41.122Z <fetch> INFO fetch block [201, 300]
graphql-engine_1  | 2021-06-05T22:20:43.244Z <express> INFO request completed

```

## 6. Поиск playground

Перейдите по адресу http: // localhost: 3000 / и вставьте запрос ниже в левую часть экрана, а затем нажмите кнопку воспроизведения.

```
{
 query{
   starterEntities(last:10, orderBy:FIELD1_ASC ){
     nodes{
       field1
     }
   }
 }
}

```

Площадка подзапросов на localhost.

![playground localhost](/assets/img/subql_playground.png)

Количество playground блоков должно совпадать с количеством блоков (технически высотой блока) в терминале.

## Заключение

В этом кратком руководстве мы продемонстрировали основные шаги по запуску проекта и запуску с помощью Docker, а затем перешли на localhost: 3000 и выполнили запрос, чтобы вернуть номер блока сети Polkadot в основной сети.

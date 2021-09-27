# Установка SubQuery

Для создании проекта SubQuery требуются различные компоненты. Для запуска индексатора требуется компонент [@subql/node](https://github.com/subquery/subql/tree/docs-new-section/packages/node). Для генерации запросов требуется библиотека [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query).

## Установка @subql/cli

Библиотека [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) помогает создать фреймворк проекта. Это означает, что вам не нужно начинать с нуля.

Установите SubQuery CLI на терминал, используя Yarn или NPM:

```shell
# Yarn
yarn global add @subql/cli

# NPM
npm install -g @subql/cli
```

Затем вы можете запустить справку, чтобы увидеть доступные команды и использовать их в CLI:

```shell
справка subql
```

## Установите @subql/node

Узел SubQuery - это реализация, которая извлекает субстратегически данные блокчейна в рамках проекта SubQuery и сохраняет их в базу данных Postgres.

Установите ноду SubQuery на терминал, используя Yarn или NPM:

```shell
# Yarn
yarn global add @subql/node

# NPM
npm install -g @subql/node
```

После установки вы можете запустить узел с:

```shell
subql-узел <command>
```

> Примечание: Если вы используете Docker или хостинг вашего проекта в проектах SubQuery вы можете пропустить этот шаг. Это происходит потому, что узел SubQuery уже находится в контейнере Docker и в инфраструктуре хостинга.

## Установите @subql/query

Библиотека запросов SubQuery предоставляет сервис, который позволяет запускать ваш проект в среде "playground" через ваш браузер.

Установите запрос SubQuery на терминал с помощью Yarn или NPM:

```shell
# Yarn
yarn global add @subql/query

# NPM
npm install -g @subql/query
```

> Примечание: Если вы используете Docker или хостинг вашего проекта в проектах SubQuery вы можете пропустить этот шаг. Это происходит потому, что узел SubQuery уже находится в контейнере Docker и в инфраструктуре хостинга.

# Как запустить узел индексатора?

## Видео гайд

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/QfNsR12ItnA" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Введение

Запуск узла индексатора - еще один вариант помимо использования Docker или размещения проекта в [ SubQuery Projects ](https://project.subquery.network/). Это требует больше времени и усилий, но улучшит ваше понимание того, каким образом работает SubQuery.

## Postgres

Для запуска узла индексатора в вашей инфраструктуре потребуется установка базы данных Postgres. Вы можете установить Postgres [ здесь ](https://www.postgresql.org/download/) а также убедиться, что версия 12 или выше.

## Установка subql/node

Затем, чтобы запустить узел SubQuery, выполните следующую команду:

```shell
npm install -g @subql/node
```

The -g flag means to install it globally which means on OSX, the location will be /usr/local/lib/node_modules.

После установки вы можете проверить версию, запустив:

```shell
> subql-node --version
0.19.1
```

## Настройка конфигов DB

Затем вам нужно установить следующие переменные среды:

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
```

Конечно, если у вас разные значения для вышеуказанных ключей, отрегулируйте их соответствующим образом. Обратите внимание, что команда ` env ` отобразит текущие переменные среды и что этот процесс устанавливает эти значения только временно. То есть они действительны только на время работы с терминалом. Чтобы установить их навсегда, сохраните их в своем ~ / bash_profile.

## Индексирование проекта

To start indexing a project, navigate into your project folder and run the following command:

```shell
subql-node -f .
```

If you do not have a project handy, `git clone https://github.com/subquery/subql-helloworld`. You should see the indexer node kick into life and start indexing blocks.

## Inspecting Postgres

If you navigate to Postgres, you should see two tables created. `public.subqueries` and `subquery_1.starter_entities`.

`public.subqueries` only contains 1 row which the indexer checks upon start up to “understand the current state” so it knows where to continue from. The `starter_entities` table contains the indexes. To view the data, run `select (*) from subquery_1.starter_entities`.

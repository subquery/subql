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

Чтобы начать индексирование проекта, перейдите в папку своего проекта и выполните следующую команду:

```shell
subql-node -f .
```

Если у вас нет под рукой проекта, ` git clone https://github.com/subquery/subql-helloworld `. Вы должны увидеть, как узел индексатора заработает и начнет индексировать блоки.

## Проверка Postgres

Если вы перейдете в Postgres, вы должны увидеть две созданные таблицы. `public.subqueries` and `subquery_1.starter_entities`.

`public.subqueries` содержит только 1 строку, которую индексатор проверяет при запуске, чтобы «понять текущее состояние», чтобы понимать, продолжение. Таблица ` starter_entities ` содержит индексы. Чтобы просмотреть данные, запустите ` select (*) из subquery_1.starter_entities `.

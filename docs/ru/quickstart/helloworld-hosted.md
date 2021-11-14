# Hello World (SubQuery hosted)

Цель этого краткого руководства - показать, как можно за несколько простых шагов запустить стартовый проект по умолчанию в SubQuery Projects (наша управляемая служба).

Мы возьмем простой стартовый проект (и все, что мы узнали до сих пор), но вместо того, чтобы запускать его локально в Docker, мы воспользуемся преимуществами инфраструктуры управляемого хостинга SubQuery. Другими словами, мы позволяем SubQuery выполнять всю тяжелую работу, запускать и управлять производственной инфраструктурой.

## Цели обучения

В конце этого краткого руководства вам следует:

- понимать необходимые предварительные условия
- иметь возможность разместить проект в [ SubQuery Projects ](https://project.subquery.network/)
- запустите простой запрос, чтобы получить высоту блока основной сети Polkadot, используя игровую площадку
- запустите простой запрос GET, чтобы получить высоту блока основной сети Polkadot, используя cURL

## Целевая аудитория

Это руководство предназначено для новых разработчиков, имеющих некоторый опыт разработки и заинтересованных в получении дополнительных сведений о SubQuery.

## Видео-гайд

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Предварительные условия

Вам понадобится:

- аккаунт GitHub

## 1. Шаг 1: Создайте свой проект

Давайте создадим проект с именем subql_hellowworld и запустим обязательную установку, генерацию кода и сборку с вашим любимым менеджером пакетов.

```shell
> subql init --starter subqlHelloWorld
yarn install
yarn codegen
yarn build
```

Однако НЕ запускайте docker команды.

## 2. Шаг 2. Создайте репозиторий GitHub

В GitHub создайте новый публичный репозиторий. Укажите имя и сделайте его общедоступным. Здесь пока все по умолчанию.

![Создать репозиторий GitHub](/assets/img/github_create_new_repo.png)

Обратите внимание на свой URL-адрес GitHub, он должен быть общедоступным, чтобы SubQuery мог получить к нему доступ.

![Создать репозиторий GitHub](/assets/img/github_repo_url.png)

## 3. Шаг 3. Отправьте на GitHub

Вернувшись в каталог проекта, инициализируйте его как каталог git. В противном случае вы можете получить ошибку «fatal: not a git repository (или любой из parent directories): .git»

```shell
git init
```

Затем добавьте удаленный репозиторий с помощью команды:

```shell
git remote add origin https://github.com/seandotau/subqlHelloWorld.git
```

Это в основном устанавливает ваш удаленный репозиторий на «https://github.com/seandotau/subqlHelloWorld.git» и дает ему имя «origin», которое является стандартной номенклатурой для удаленного репозитория в GitHub.

Затем мы добавляем код в наш репо с помощью следующих команд:

```shell
> git add .
> git commit -m "First commit"
[master (root-commit) a999d88] First commit
10 files changed, 3512 insertions(+)
create mode 100644 .gitignore
create mode 100644 README.md
create mode 100644 docker-compose.yml
create mode 100644 package.json
create mode 100644 project.yaml
create mode 100644 schema.graphql
create mode 100644 src/index.ts
create mode 100644 src/mappings/mappingHandlers.ts
create mode 100644 tsconfig.json
create mode 100644 yarn.lock
> git push origin master
Enumerating objects: 14, done.
Counting objects: 100% (14/14), done.
Delta compression using up to 12 threads
Compressing objects: 100% (13/13), done.
Writing objects: 100% (14/14), 59.35 KiB | 8.48 MiB/s, done.
Total 14 (delta 0), reused 0 (delta 0)
To https://github.com/seandotau/subqlHelloWorld.git
 * [new branch]      master -> master

```

Команда push означает «пожалуйста, отправьте мой код В исходное репо ИЗ моего главного локального репозитория». При обновлении GitHub должен отображаться весь код в GitHub.

![First commit](/assets/img/first_commit.png)

Теперь, когда у вас есть код в GitHub, давайте посмотрим, как мы можем разместить его в проектах SubQuery.

## 4. Создайте свой проект

Перейдите к [ https://project.subquery.network ](https://project.subquery.network) и войдите в свою учетную запись GitHub.

![Добро пожаловать в SubQuery Projects](/assets/img/welcome_to_subquery_projects.png)

Затем создайте новый проект,

![Добро пожаловать в SubQuery Projects](/assets/img/subquery_create_project.png)

И заполните различные поля соответствующими данными.

- ** Учетная запись GitHub: ** Если у вас более одной учетной записи GitHub, выберите, под какой учетной записью будет создан этот проект. Проекты, созданные в учетной записи организации GitHub, совместно используются участниками в этой организации.
- ** Название проекта: ** Дайте здесь название вашему проекту.
- ** Субтитры: ** Обеспечьте субтитры для вашего проекта.
- ** Описание: ** Объясните, что делает ваш проект SubQuery.
- ** URL-адрес репозитория GitHub: ** Это должен быть действующий URL-адрес GitHub для общедоступного репозитория, содержащего ваш проект SubQuery. Файл schema.graphql должен находиться в корне вашего каталога.
- **Hide project:**: если этот флажок установлен, проект будет скрыт от общедоступного SubQuery explorer. Не устанавливайте этот флажок, если хотите поделиться своим SubQuery с сообществом!

![Создать параметры SubQuery](/assets/img/create_subquery_project_parameters.png)

Когда вы нажмете «Создать», вы попадете на свою панель управления.

![Панель управления SubQuery Project](/assets/img/subquery_project_dashboard.png)

Панель управления содержит много полезной информации, такой как сеть, которую она использует, URL-адрес репозитория GitHub исходного кода, который он запускает, когда он был создан и последний раз обновлялся, и, в частности, сведения о развертывании.

## 5. Шаг 5. Разверните свой проект

Теперь, когда вы создали свой проект в SubQuery Projects и настроили отображение дисплея, следующим шагом будет развертывание вашего проекта, чтобы он стал работоспособным. Развертывание версии запускает новую операцию индексирования SubQuery и настраивает необходимую службу запросов для начала приема запросов GraphQL. Здесь вы также можете развернуть новые версии в существующих проектах.

Вы можете выбрать развертывание в различных средах, таких как производственный слот или промежуточный слот. Здесь мы произведём развёртывание в производственный слот. При нажатии на кнопку «Развернуть» открывается экран со следующими полями:

![Развёртывание в производственный слот](/assets/img/deploy_production_slot.png)

- **Commit Hash of new Version:** В GitHub выберите правильную фиксацию SubQuery project codebase, которую вы хотите развернуть
- **Indexer Version:** Это версия службы узла SubQuery, на которой вы хотите запустить этот SubQuery. См. [ @ subql / node ](https://www.npmjs.com/package/@subql/node)
- **Query Version:** Это версия службы запросов SubQuery, в которой вы хотите запустить этот SubQuery. См. [ @ subql / node ](https://www.npmjs.com/package/@subql/query)

Поскольку у нас есть только один commit, в раскрывающемся списке есть только один вариант. Мы также будем работать с последней Indexer Version и query version, поэтому примем значения по умолчанию и затем нажмем «Deploy Update».

После этого вы увидите свое развертывание в статусе «Processing». Здесь ваш код развертывается в управляемой инфраструктуре SubQuery. В основном сервер раскручивается по запросу и подготавливается для вас. Это займет несколько минут, так что самое время, чтобы выпить кофе!

![Обработка развертывания](/assets/img/deployment_processing.png)

Развертывание запущено.

![Запуск развёртывания](/assets/img/deployment_running.png)

## 6. Шаг 6. Тестирование вашего проекта

Чтобы протестировать свой проект, нажмите на 3 многоточия и выберите «View on SubQuery Explorer».

![Просмотр проектов Subquery](/assets/img/view_on_subquery.png)

Это перенесет вас на знакомую «Playground», где вы можете нажать кнопку воспроизведения и просмотреть результаты запроса.

![Площадка Subquery](assets/img/subquery_playground.png)

## 7. Шаг 7: Бонусный шаг

Для проницательных: вы помните, что в целях обучения последним пунктом было выполнение простого запроса GET. Для этого нам нужно будет получить «Query Endpoint», отображаемую в деталях развертывания.

![Конечная точка запроса](/assets/img/query_endpoint.png)

Затем вы можете отправить запрос GET на эту конечную точку либо с помощью вашего любимого клиента, такого как [ Postman ](https://www.postman.com/) или [ Mockoon ](https://mockoon.com/), либо через cURL в вашем терминале. Для простоты ниже будет показан cURL.

Команда curl для запуска:

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

выдача результатов:

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

Читаемость здесь не важна, так как у вас, вероятно, будет какой-то внешний код для использования и анализа этого ответа JSON.

## Заключение

В этом кратком руководстве, размещенном в SubQuery, мы показали, насколько быстро и легко было взять проект Subql и развернуть его в [ SubQuery Projects ](https://project.subquery.network), где для вашего удобства предоставляется вся инфраструктура. Существует встроенная игровая площадка для выполнения различных запросов, а также конечная точка API для интеграции вашего кода.

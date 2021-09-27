# Как начать с другой высоты блока?

## Видеоинструкция

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/WSN5BaCzsbo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Вступление

По умолчанию все запускаемые проекты начинают синхронизироваться с блокчейном с генезис блока. Другими словами - с первого блока. Для больших блокчейнов это, как правило, может занять несколько дней или даже недель для полной синхронизации.

Чтобы запустить синхронизацию ноды SubQuery с ненулевой высоты, все, что вам нужно сделать, это изменить файл project.yaml и изменить ключ startBlock.

Ниже представлен файл project.yaml, в котором начальный блок установлен на 1000000

```shell
specVersion: 0.0.1
description: ""
repository: ""
schema: ./schema.graphql
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1000000
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
```

## Почему бы не начать с нуля?

Основная причина в том, что это может сократить время синхронизации блокчейна. Это означает, что если вас интересуют транзакции только за последние 3 месяца, вы можете синхронизировать только последние 3 месяца, что означает меньшее время ожидания, а значит вы можете быстрее начать разработку.

## В чем недостаток старта с ненулевого блока?

Наиболее очевидным недостатком будет то, что вы не сможете запрашивать данные из блокчейна для блоков, которых у вас нет.

## Как узнать текущую высоту блокчейна?

Если вы используете сеть Polkadot, вы можете посетить [https://polkascan.io/](https://polkascan.io/), выбрать сеть, а затем просмотреть номер "Finalised Block".

## Do I have to do a rebuild or a codegen?

No. Поскольку вы изменяете файл project.yaml, который по сути является файлом конфигурации, вам не нужно будет перестраивать или регенерировать код машинописного текста.

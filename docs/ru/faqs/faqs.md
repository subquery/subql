# Часто задаваемые вопросы

## Что такое SubQuery?

SubQuery - это проект с открытым исходным кодом, который позволяет разработчикам индексировать, преобразовывать и запрашивать данные цепи Substrate для питания своих приложений.

SubQuery также предоставляет бесплатный хостинг проектов по производству для разработчиков, позволяя им снять ответственность за построение инфраструктуры, и также позволяет разработчикам делать то, что они делают лучше всего - строить.

## Какой лучший способ начать работу с SubQuery?

Лучший способ начать работу с SubQuery - попробовать наш [Урок «Приветствуем мир»](../quickstart/helloworld-localhost.md). Это простая 5-минутная прогулка по загрузке начального шаблона, построению проекта, а затем с помощью использования Docker для запуска узла на вашем локальном хосте и выполнения простого запроса.

## Как я могу внести свой вклад или оставить отзыв для SubQuery?

Нам нравится вклад и отзывы сообщества. Чтобы внести свой код, форкните интересующее вас хранилище и внесите свои изменения. Затем отправьте PR или Pull Request. Ах, не забудь еще и протестировать! Также ознакомьтесь с нашими рекомендациями внесению дополнений (скоро).

Чтобы оставить отзыв, свяжитесь с нами по адресу hello@subquery.network или перейдите на наш [discord channel](https://discord.com/invite/78zg8aBSMG)

## Сколько стоит разместить мой проект в SubQuery?

Размещение вашего проекта в SubQuery Projects абсолютно бесплатно - это наш способ отблагодарить сообщество. Чтобы научиться каким образом размещать ваш проект у нас, пожалуйста ознакомьтесь с руководством [Hello World (SubQuery hosted)](../quickstart/helloworld-hosted.md).

## Что такое слоты развертывания?

Слоты развертывания - это функция в [SubQuery Projects](https://project.subquery.network), которая является эквивалентом среды разработки. Например, в любой организации занимающейся программным обеспечением обычно есть как минимум среда разработки и производственная среда (без учета localhost). Обычно дополнительные условия, такие как постановка и пре-продакшен или даже QA, включаются в зависимости от потребностей организации и их разработки.

SubQuery в настоящее время имеет два доступных слота. Промежуточный слот и производственный слот. Это позволяет разработчикам установить свой SubQuery в промежуточную среду и если все хорошо, "продвинуть в производство" щелчком по кнопке.

## В чем преимущество промежуточного слота?

The main benefit of using a staging slot is that it allows you to prepare a new release of your SubQuery project without exposing it publicly. You can wait for the staging slot to reindex all data without affecting your production applications.

The staging slot is not shown to the public in the [Explorer](https://explorer.subquery.network/) and has a unique URL that is visible only to you. And of course, the separate environment allows you to test your new code without affecting production.

## What are extrinsics?

If you are already familiar with blockchain concepts, you can think of extrinsics as comparable to transactions. More formally though, an extrinsic is a piece of information that comes from outside the chain and is included in a block. There are three categories of extrinsics. They are inherents, signed transactions, and unsigned transactions.

Inherent extrinsics are pieces of information that are not signed and only inserted into a block by the block author.

Signed transaction extrinsics are transactions that contain a signature of the account that issued the transaction. They stands to pay a fee to have the transaction included on chain.

Unsigned transactions extrinsics are transactions that do not contain a signature of the account that issued the transaction. Unsigned transactions extrinsics should be used with care because there is nobody paying a fee, becaused it is signed. Because of this, the transaction queue lacks economic logic to prevent spam.

For more information, click [here](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics).
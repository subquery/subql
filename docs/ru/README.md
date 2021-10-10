<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">Добро пожаловать в SubQuery’s <span>Docs</span></h2>
        <p>Изучите и преобразуйте свои ончейн данные, чтобы быстрее создавать интуитивно понятные приложения!</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title">Быстрый старт <span>руководства</span></h2>
      <p>Понимайте SubQuery, используя традиционный пример Hello World. Использование шаблона проекта с помощью Докера , вы можете быстро запустить узел и начать искать данные в блокчейне всего за несколько минут с помощью нескольких простых команд.
      </p>
      <span class="button">
        <router-link :to="{path: '/quickstart/helloworld-localhost/'}">
          <span>Начать</span>
        </router-link>
      </span>
    </div>
  </section>
</div>
<div class="main">
  <div>
    <ul class="list">
      <li>
        <router-link :to="{path: '/tutorials_examples/introduction/'}">
          <div>
            <img src="/assets/img/tutorialsIcon.svg" />
            <span>Учебные материалы и примеры</span>
            <p>Обучение на практике Учебники и примеры по созданию различных проектов SubQuery.</p>
          </div>
        </router-link>
      </li>
      <li>
        <router-link :to="{path: '/create/introduction/'}">
          <div>
            <img src="/assets/img/docsIcon.svg" />
            <span>Техническая документация</span>
            <p>Написано разработчиками для разработчиков. Найдите то, что нужно для быстрого создания приложений.</p>
          </div>
        </router-link>
      </li>
      <li>
        <a href="https://static.subquery.network/whitepaper.pdf" target="_blank">
          <div>
            <img src="/assets/img/networkIcon.svg" />
            <span>The SubQuery Network</span>
            <p>Децентрализованное будущее SubQuery. Подробнее о вознаграждении индексаторов и потребителей.</p>
          </div>
        </a>
      </li>
    </ul>
  </div>
</div>
<section class="faqSection main">
  <div>
    <h2 class="title">Ответы на вопросы</h2>
    <ul class="faqList">
      <li>
        <div class="title">Что такое SubQuery?</div>
        <div class="content">
          <p>SubQuery - это проект с открытым исходным кодом, который позволяет разработчикам индексировать, преобразовывать и запрашивать данные блокчейна Substrate для своих приложений.</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">ПРОЧИТАТЬ БОЛЬШЕ</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">Какой лучший способ начать работу с SubQuery?</div>
        <div class="content">
          <p>Лучший способ начать работу с SubQuery - попробовать наш <a href="/quickstart/helloworld-localhost/">Hello World tutorial</a>. Это простая 5-минутка по скачиванию стартового шаблона, созданию проекта, а затем запуска узла на локальном хосте и выполнения простого запроса с помощью Docker. </p>
        </div>
      </li>
      <li>
        <div class="title">Как я могу внести свой вклад или оставить отзыв на SubQuery?</div>
        <div class="content">
          <p>Мы любим вносить свой вклад и получать обратную связь от сообщества. Чтобы дополнить код, форкните репозиторий интересов и внесите изменения. Затем отправьте PR или Pull Request. Кстати, не забудьте проверить! Также ознакомьтесь с нашими рекомендациями внесению дополнений (скоро). </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">ПРОЧИТАТЬ БОЛЬШЕ</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">Сколько стоит разместить мой проект в SubQuery?</div>
        <div class="content">
          <p>Размещение вашего проекта в SubQuery Projects абсолютно бесплатно - это наш способ отблагодарить сообщество. Чтобы научиться размещать ваш проект вместе с нами, ознакомьтесь с обучением <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery Hosted)</a>.</p>
          <span class="more">
            <router-link :to="{path: '/publish/publish/'}"> РАЗМЕЩЕНИЕ ПРОЕКТА </router-link>
          </span>
        </div>
      </li>
    </ul><br>
    Дальнейшие вопросы можно найти в нашей <router-link :to="{path: '/faqs/faqs/'}">Часто задаваемые вопросы (FAQ)</router-link> странице.    
  </div>
</section>
<section class="main">
  <div>
    <div class="lastIntroduce lastIntroduce_1">
        <h5>Интеграция с вашей собственной цепочкой?</h5>
        <p>Создаете ли вы новый парачейн или совершенно новый блокчейн в Substrate - SubQuery может помочь вам индексировать и диагностировать данные цепочки. SubQuery разработан для того, чтобы легко интегрироваться с пользовательской цепочкой Substrate.</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}"> УЗНАЙТЕ, КАК ИНТЕГРИРОВАТЬ В ВАШУ ЦЕПЬ </router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>Поддержка и содействие</h5>
        <p>У Вас есть вопрос или интересно узнать больше или как Вы можете помочь? Мы будем рады услышать от вас. Пожалуйста, свяжитесь с нами по электронной почте или через социальные сети по ссылкам ниже. Нужна техническая экспертиза? Присоединяйтесь к нашему сообществу Discord и получите поддержку от наших членов сообщества. </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">ПРИСОЕДИНЯЙТЕСЬ К ОБСУЖДЕНИЮ В ДИСКОРДЕ</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>Свяжитесь с нами</span>
    <a href="mailto:hello@subquery.network">hello@subquery.network</a>
  </div>
  <div>
    <div>Подпишитесь на нас в социальных сетях</div>
    <div class="connectWay">
      <a href="https://discord.com/invite/78zg8aBSMG" target="_blank" class="connectDiscord">discord</a>
      <a href="https://twitter.com/subquerynetwork" target="_blank" class="connectTwitter">twitter</a>
      <a href="https://medium.com/@subquery" target="_blank" class="connectMedium">medium</a>
      <a href="https://t.me/subquerynetwork" target="_blank" class="connectTelegram">telegram</a>
      <a href="https://github.com/OnFinality-io/subql" target="_blank" class="connectGithub">github</a>
      <a href="https://matrix.to/#/#subquery:matrix.org" target="_blank" class="connectMatrix">matrix</a>
      <a href="https://www.linkedin.com/company/subquery" target="_blank" class="connectLinkedin">linkedin</a>
    </div>
  </div>
</section>
</div> </div>
<div class="footer">
  <div class="main"><div>SubQuery © 2021</div></div>
</div>
<script charset="utf-8" src="/assets/js/welcome.js"></script>

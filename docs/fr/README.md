<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">Bienvenue dans la documentation <span>de SubQuery</span></h2>
        <p>Explorez et transformez vos données en chaîne pour construire des dApps plus rapidement !</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title">Guide de <span>Démarrage rapide</span></h2>
      <p>Comprenez SubQuery en mettant la main sur un exemple traditionnel de Hello World. Utiliser un projet de modèle dans un environnement Docker, vous pouvez rapidement faire démarrer un nœud et commencer à interroger une blockchain en quelques minutes à l'aide de quelques commandes simples.
      </p>
      <span class="button">
        <router-link :to="{path: '/quickstart/helloworld-localhost/'}">
          <span>Commencez</span>
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
            <span>Tutoriels et Exemples</span>
            <p>Apprentissage par la pratique. Tutoriels et exemples sur la façon de construire différents projets SubQuery.</p>
          </div>
        </router-link>
      </li>
      <li>
        <router-link :to="{path: '/create/introduction/'}">
          <div>
            <img src="/assets/img/docsIcon.svg" />
            <span>Documents de référence technique</span>
            <p>Écrit par des développeurs pour les développeurs. Trouvez ce dont vous avez besoin pour construire de super dApps rapidement.</p>
          </div>
        </router-link>
      </li>
      <li>
        <a href="https://static.subquery.network/whitepaper.pdf" target="_blank">
          <div>
            <img src="/assets/img/networkIcon.svg" />
            <span>Le réseau SubQuery</span>
            <p>Le futur décentralisé de SubQuery. En savoir plus sur la façon dont les indexeurs et les consommateurs sont récompensés.</p>
          </div>
        </a>
      </li>
    </ul>
  </div>
</div>
<section class="faqSection main">
  <div>
    <h2 class="title">FAQ</h2>
    <ul class="faqList">
      <li>
        <div class="title">Qu'est-ce que SubQuery ?</div>
        <div class="content">
          <p>SubQuery est un projet open source qui permet aux développeurs d'indexer, transformer et interroger les données de la chaîne Substrate pour alimenter leurs applications.</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">LIRE PLUS</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">Quelle est la meilleure façon de commencer avec SubQuery ?</div>
        <div class="content">
          <p>La meilleure façon de commencer avec SubQuery est d'essayer notre <a href="/quickstart/helloworld-localhost/">tutoriel Hello World</a>. Il s'agit d'une prise en main de 5 minutes pour télécharger le modèle de démarrage, construire le projet, puis en utilisant Docker pour exécuter un noeud sur votre serveur local et en exécutant une requête simple. </p>
        </div>
      </li>
      <li>
        <div class="title">Comment puis-je contribuer ou faire un retour à SubQuery?</div>
        <div class="content">
          <p>Nous aimons les contributions et les commentaires de la communauté. Pour contribuer au code, faire un fork du répertoire d'intérêt et apporter vos changements. Ensuite soumettez une PR ou une Pull Request. Oh, n'oubliez pas de tester aussi! Consultez également nos lignes directrices sur les contributions (bientôt disponible). </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">LIRE PLUS</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">Combien coûte l'hébergement de mon projet dans SubQuery Projects?</div>
        <div class="content">
          <p>Héberger votre projet dans SubQuery Projects est absolument gratuit - c'est notre façon de le rendre à la communauté. Pour apprendre comment héberger votre projet avec nous, veuillez consulter le tutoriel <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery Hosted)</a>.</p>
          <span class="more">
            <router-link :to="{path: '/publish/publish/'}">HEBERGER VOTRE PROJET</router-link>
          </span>
        </div>
      </li>
    </ul><br>
    Pour plus de questions fréquemment posées, veuillez consulter notre <router-link :to="{path: '/faqs/faqs/'}">page de</router-link> FAQ.    
  </div>
</section>
<section class="main">
  <div>
    <div class="lastIntroduce lastIntroduce_1">
        <h5>Intégrer à votre chaîne personnalisée ?</h5>
        <p>Que vous construisiez un nouveau parachain ou une toute nouvelle blockchain sur Substrate - SubQuery peut vous aider à indexer et à résoudre les données de votre chaîne. SubQuery est conçu pour s'intégrer facilement à une chaîne personnalisée basée sur Substrate.</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">APPRENDRE COMMENT INTÉGRER AVEC VOTRE CHAIN</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>Soutenir et Contribuer</h5>
        <p>Vous avez une question ou intéressé à en savoir plus ou comment vous pouvez contribuer? Nous aimerions connaître votre avis. Veuillez nous contacter par e-mail ou via les réseaux sociaux à partir des liens ci-dessous. Besoin d'expertise technique? Rejoignez notre communauté Discord et recevez de l'aide de nos membres passionnés de la communauté. </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">REJOINDRE LA CONVERSATION SUR DISCORD</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>Contactez-nous</span>
    <a href="mailto:hello@subquery.network">hello@subquery.network</a>
  </div>
  <div>
    <div>Suis-nous sur les médias sociaux </div>
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

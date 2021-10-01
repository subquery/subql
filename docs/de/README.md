<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">Herzlich Willkommen bei den <span>Dokumenten</span> von SubQuery</h2>
        <p>Erkunden und transformieren Sie Ihre Kettendaten, um intuitive dApps schneller zu erstellen!</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title">Schnellstart <span>Anleitung</span></h2>
      <p>Verständnis von SubQuery, indem Sie ein traditionelles Hallo World-Beispiel ausprobieren. Mit einem Vorlagenprojekt in einer Docker-Umgebung können Sie einen Knoten schnell zum Laufen bringen und mit wenigen einfachen Befehlen in wenigen Minuten eine Blockchain abfragen.
      </p>
      <span class="button">
        <router-link :to="{path: '/quickstart/helloworld-localhost/'}">
          <span>Get started</span>
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
            <span>Tutorials and Examples</span>
            <p>Learning by doing. Tutorials and examples on how to build various SubQuery projects.</p>
          </div>
        </router-link>
      </li>
      <li>
        <router-link :to="{path: '/create/introduction/'}">
          <div>
            <img src="/assets/img/docsIcon.svg" />
            <span>Technical Reference Docs</span>
            <p>Written by developers for developers. Find what you need to build awesome dApps quickly.</p>
          </div>
        </router-link>
      </li>
      <li>
        <a href="https://static.subquery.network/whitepaper.pdf" target="_blank">
          <div>
             <img src="/assets/img/networkIcon.svg" />
             <span>Das SubQuery-Netzwerk</span>
             <p>Die dezentrale Zukunft von SubQuery. Lesen Sie mehr darüber, wie Indexer und Verbraucher belohnt werden.</p>
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
        <div class="title">Was ist SubQuery?</div>
        <div class="content">
          <p>SubQuery ist ein Open-Source-Projekt, das es Entwicklern ermöglicht, Substratkettendaten zu indizieren, umzuwandeln und abzufragen, um ihre Anwendungen zu unterstützen.</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">Was ist der beste Weg, um mit SubQuery zu beginnen?</div>
        <div class="content">
          <p>The best way to get started with SubQuery is to try out our <a href="/quickstart/helloworld-localhost/">Hello World tutorial</a>. Dies ist ein einfacher 5-minütiger Spaziergang durch das Herunterladen der Starter-Vorlage, das Erstellen des Projekts und die anschließende Verwendung von Docker, um einen Knoten auf Ihrem localhost auszuführen und eine einfache Abfrage auszuführen. </p>
        </div>
      </li>
      <li>
        <div class="title">Wie kann ich SubQuery beitragen oder Feedback geben?</div>
        <div class="content">
          <p>Wir lieben Beiträge und Feedback aus der Community. Um Code beizutragen, verzweigen Sie das gewünschte Repository und nehmen Sie Ihre Änderungen vor. Senden Sie dann einen PR- oder Pull-Request. Oh, vergiss auch nicht zu testen! Sehen Sie sich auch unsere Beitragsrichtlinien an (demnächst). </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">Wie viel kostet es, mein Projekt in SubQuery-Projekten zu hosten?</div>
        <div class="content">
          <p>Das Hosten Ihres Projekts in SubQuery Projects ist absolut kostenlos - es ist unsere Art, der Community etwas zurückzugeben. To learn how to host your project with us, please check out the <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery Hosted)</a> tutorial.</p>
          <span class="more">
            <router-link :to="{path: '/publish/publish/'}">HOSTING YOUR PROJECT</router-link>
          </span>
        </div>
      </li>
    </ul><br>
    For further frequently asked questions, please see our <router-link :to="{path: '/faqs/faqs/'}">FAQ's</router-link> page.    
  </div>
</section>
<section class="main">
  <div>
    <div class="lastIntroduce lastIntroduce_1">
        <h5>Integration in Ihre benutzerdefinierte Kette?</h5>
        <p>Egal, ob Sie eine neue Parachain oder eine völlig neue Blockchain auf Substrate erstellen – SubQuery kann Ihnen helfen, die Daten Ihrer Kette zu indizieren und Fehler zu beheben. SubQuery wurde für die einfache Integration in eine benutzerdefinierte, auf Substraten basierende Kette entwickelt.</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">LEARN HOW TO INTEGRATE WITH YOUR CHAIN</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>Unterstützen und beitragen</h5>
        <p>Haben Sie eine Frage oder möchten Sie mehr wissen oder wie Sie dazu beitragen können? Wir würden uns freuen, von dir zu hören. Bitte kontaktieren Sie uns per E-Mail oder Social Media über die untenstehenden Links. Benötigen Sie technische Expertise? Treten Sie unserer Discord-Community bei und erhalten Sie Unterstützung von unseren leidenschaftlichen Community-Mitgliedern. </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">TEILNEHMEN DEM GESPRÄCH AUF DISCORD</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>Kontaktieren Sie uns</span>
    <a href="mailto:hello@subquery.network">hello@subquery.network</a>
  </div>
  <div>
    <div>Folgen Sie uns in den sozialen Netzwerken</div>
    <div class="connectWay">
      <a href="https://discord.com/invite/78zg8aBSMG" target="_blank" class="connectDiscord">discord</a>
      <a href="https://twitter.com/subquerynetwork" target="_blank" class="connectTwitter">twitter</a>
      <a href="https://medium.com/@subquery" target="_blank" class="connectMedium">medium</a>
      <a href="https://t.me/subquerynetwork" target="_blank" class="connectTelegram">telegramm</a>
      <a href="https://github.com/OnFinality-io/subql" target="_blank" class="connectGithub">github</a>
      <a href="https://matrix.to/#/#subquery:matrix.org" target="_blank" class="connectMatrix">Matrix</a>
      <a href="https://www.linkedin.com/company/subquery" target="_blank" class="connectLinkedin">linkedin</a>
    </div>
  </div>
</section>
</div> </div>
<div class="footer">
  <div class="main"><div>SubQuery © 2021</div></div>
</div>
<script charset="utf-8" src="/assets/js/welcome.js"></script>

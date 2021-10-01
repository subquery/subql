<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">Bienvenido a los <span>documentos</span> de SubQuery</h2>
        <p>¡Explora y transforma los datos de tu cadena para crear dApps intuitivos más rápido!</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title">Inicio rápido <span>Guía</span></h2>
      <p>Vamos a comprender SubQuery poniendo manos a la obra un ejemplo tradicional de Hola Mundo. Utilizando un proyecto de plantilla dentro de un entorno Docker puede obtener rápidamente un nodo funcionando y comenzar a consultar un blockchain en tan solo unos minutos con algunos comandos simples.
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
            <span>La red de SubQuery</span>
            <p>El futuro descentralizado de SubQuery. Lea más sobre cómo se recompensa a los indexadores y consumidores.</p>
          </div>
        </a>
      </li>
    </ul>
  </div>
</div>
<section class="faqSection main">
  <div>
    <h2 class="title">Preguntas Frecuentes (FAQ)</h2>
    <ul class="faqList">
      <li>
        <div class="title">¿Qué es SubQuery?</div>
        <div class="content">
          <p>SubQuery es un proyecto de código abierto que permite a los desarrolladores indexar, transformar y consultar datos en cadena de Substrate para potenciar sus aplicaciones.</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">¿Cuál es la mejor manera de comenzar con SubQuery?</div>
        <div class="content">
          <p>The best way to get started with SubQuery is to try out our <a href="/quickstart/helloworld-localhost/">Hello World tutorial</a>. Este es un simple paseo de 5 minutos para descargar la plantilla de inicio, construir el proyecto, y luego usar Docker para ejecutar un nodo en su localhost y ejecutar una simple consulta. </p>
        </div>
      </li>
      <li>
        <div class="title">¿Cómo puedo contribuir o dar comentarios a SubQuery?</div>
        <div class="content">
          <p>Nos encantan las contribuciones y comentarios de la comunidad. Para contribuir con el código, bifurca el repositorio de interés y realice sus cambios. Luego envíe un PR o Pull Request. ¡Oh, no te olvides del test probar también! Consulte también nuestras directrices de contribuciones (próximamente). </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">¿Cuánto cuesta alojar mi proyecto en SubQuery Projects?</div>
        <div class="content">
          <p>Hospedar tu proyecto en SubQuery Projects es absolutamente gratuito - es nuestra manera de devolver a la comunidad. To learn how to host your project with us, please check out the <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery Hosted)</a> tutorial.</p>
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
        <h5>¿Integrar con tu cadena personalizada?</h5>
        <p>Ya sea que esté construyendo una nueva cadena de bloques o una cadena de bloques completamente nueva en Substrate - SubQuery puede ayudarle a indexar y solucionar problemas los datos de su cadena. SubQuery está diseñado para integrar fácilmente con una cadena basada en Substrate personalizada.</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">LEARN HOW TO INTEGRATE WITH YOUR CHAIN</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>Soporte y contribución</h5>
        <p>Have a question or interested to know more or how you can contribute? We’d love to hear from you. ¡Queremos saber tu opinión! Por favor contáctenos a través de correo electrónico o redes sociales desde los siguientes enlaces. ¿Necesita conocimientos técnicos? Únete a nuestra comunidad de Discord y recibe apoyo de nuestros apasionados miembros de la comunidad. </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">ÚNETE A LA CONVERSACIÓN EN DISCORD</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>Contáctanos</span>
    <a href="mailto:hello@subquery.network">hello@subquery.network</a>
  </div>
  <div>
    <div>Síguenos en las redes sociales</div>
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

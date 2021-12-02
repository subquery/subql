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
          <span>Empezar</span>
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
            <span>Tutoriales y ejemplos</span>
            <p>Aprender haciendo. Tutoriales y ejemplos de cómo construir varios proyectos de SubQuery.</p>
          </div>
        </router-link>
      </li>
      <li>
        <router-link :to="{path: '/create/introduction/'}">
          <div>
            <img src="/assets/img/docsIcon.svg" />
            <span>Documentos de Referencia Técnica</span>
            <p>Escrito por los desarrolladores para desarrolladores. Encuentra lo que necesitas para construir dApps de manera rápida.</p>
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
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">LEER MAS</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">¿Cuál es la mejor manera de comenzar con SubQuery?</div>
        <div class="content">
          <p>La mejor manera de empezar con SubQuery es probar nuestro <a href="/quickstart/helloworld-localhost/">Tutorial de Hola Mundo</a>. Este es un simple paseo de 5 minutos para descargar la plantilla de inicio, construir el proyecto, y luego usar Docker para ejecutar un nodo en su localhost y ejecutar una simple consulta. </p>
        </div>
      </li>
      <li>
        <div class="title">¿Cómo puedo contribuir o dar comentarios a SubQuery?</div>
        <div class="content">
          <p>Nos encantan las contribuciones y comentarios de la comunidad. Para contribuir con el código, bifurca el repositorio de interés y realice sus cambios. Luego envíe un PR o Pull Request. ¡Oh, no te olvides del test probar también! Consulte también nuestras directrices de contribuciones (próximamente). </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">LEER MAS</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">¿Cuánto cuesta alojar mi proyecto en SubQuery Projects?</div>
        <div class="content">
          <p>Hospedar tu proyecto en SubQuery Projects es absolutamente gratuito - es nuestra manera de devolver a la comunidad. Para aprender cómo alojar tu proyecto con nosotros, por favor echa un vistazo al tutorial de <a href="/quickstart/helloworld-hosted/">Hola World (Hospedado en SubQuery)</a>.</p>
          <span class="more">
            <router-link :to="{path: '/publish/publish/'}">ALOJAMIENTO DE TU PROYECTO </router-link>
          </span>
        </div>
      </li>
    </ul><br>
    Para más preguntas frecuentes, por favor vea nuestra <router-link :to="{path: '/faqs/faqs/'}">FAQ's</router-link> página.    
  </div>
</section>
<section class="main">
  <div>
    <div class="lastIntroduce lastIntroduce_1">
        <h5>¿Integrar con tu cadena personalizada?</h5>
        <p>Ya sea que esté construyendo una nueva cadena de bloques o una cadena de bloques completamente nueva en Substrate - SubQuery puede ayudarle a indexar y solucionar problemas los datos de su cadena. SubQuery está diseñado para integrar fácilmente con una cadena basada en Substrate personalizada.</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">APRENDE COMO INTEGRAR CON TU CADENA</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>Soporte y contribución</h5>
        <p>¿Tienes alguna pregunta o te interesa saber más o cómo puedes contribuir? Nos encantaría saber de usted ¡Queremos saber tu opinión! Por favor contáctenos a través de correo electrónico o redes sociales desde los siguientes enlaces. ¿Necesita conocimientos técnicos? Únete a nuestra comunidad de Discord y recibe apoyo de nuestros apasionados miembros de la comunidad. </p>
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

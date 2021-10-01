<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">Welcome to SubQuery’s <span>Docs</span></h2>
        <p>Explore and transform your chain data to build intuitive dApps faster!</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title">Quick Start <span>Guide</span></h2>
      <p>Understand SubQuery by getting hands on with a traditional Hello World example. Using a template project within a Docker environment, you can quickly get a node up and running and start querying a blockchain in just a few minutes with a few simple commands.
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
            <span>The SubQuery Network</span>
            <p>SubQuery’s decentralised future. Read more about how indexers and consumers are rewarded.</p>
          </div>
        </a>
      </li>
    </ul>
  </div>
</div>
<section class="faqSection main">
  <div>
    <h2 class="title">ЧаПи (Часті Питання)</h2>
    <ul class="faqList">
      <li>
        <div class="title">What is SubQuery?</div>
        <div class="content">
          <p>SubQuery is an open source project that allows developers to index, transform, and query Substrate chain data to power their applications.</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">What is the best way to get started with SubQuery?</div>
        <div class="content">
          <p>The best way to get started with SubQuery is to try out our <a href="/quickstart/helloworld-localhost/">Hello World tutorial</a>. This is a simple 5 min walk through of downloading the starter template, building the project, and then using Docker to run a node on your localhost and running a simple query. </p>
        </div>
      </li>
      <li>
        <div class="title">How can I contribute or give feedback to SubQuery?</div>
        <div class="content">
          <p>We love contributions and feedback from the community. To contribute code, fork the repository of interest and make your changes. Then submit a PR or Pull Request. Oh, don't forget to test as well! Also check out our contributions guidelines (coming soon). </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">How much does it cost to host my project in SubQuery Projects?</div>
        <div class="content">
          <p>Hosting your project in SubQuery Projects is absolutely free - it's is our way of giving back to the community. To learn how to host your project with us, please check out the <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery Hosted)</a> tutorial.</p>
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
        <h5>Integrating with your Custom Chain?</h5>
        <p>Whether you're building a new parachain or an entirely new blockchain on Substrate - SubQuery can help you index and troubleshoot your chain's data. SubQuery is designed to easily integrate with a custom Substrate based chain.</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">LEARN HOW TO INTEGRATE WITH YOUR CHAIN</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>Support and Contribute</h5>
        <p>Have a question or interested to know more or how you can contribute? We’d love to hear from you. Please contact us via email or social media from the links below. Need technical expertise? Join our Discord community and receive support from our passionate community members. </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">JOIN THE CONVERSATION ON DISCORD</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>Contact us</span>
    <a href="mailto:hello@subquery.network">hello@subquery.network</a>
  </div>
  <div>
    <div>Follow us on social</div>
    <div class="connectWay">
      <a href="https://discord.com/invite/78zg8aBSMG" target="_blank" class="connectDiscord">діскорд</a>
<a href="https://twitter.com/subquerynetwork" target="_blank" class="connectTwitter">Твіттер</a>
<a href="https://medium.com/@subquery" target="_blank" class="connectMedium">Медіум</a>
<a href="https://t.me/subquerynetwork" target="_blank" class="connectTelegram">Телеграм</a>
<a href="https://github.com/OnFinality-io/subql" target="_blank" class="connectGithub">Гітхаб</a>
<a href="https://matrix.to/#/#subquery:matrix.org" target="_blank" class="connectMatrix">Матрікс</a>
<a href="https://www.linkedin.com/company/subquery" target="_blank" class="connectLinkedin">Лінкедін</a>
    </div>
  </div>
</section>
</div> </div>
<div class="footer">
  <div class="main"><div>SubQuery © 2021</div></div>
</div>
<script charset="utf-8" src="/assets/js/welcome.js"></script>

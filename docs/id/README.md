<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">Welcome to SubQuery’s Indonesian <span>Docs</span></h2>
        <p>Jelajahi dan ubah data chain untuk membangun dApps yang intuitif dengan lebih cepat!</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title">Cara Memulai <span>Panduan</span></h2>
      <p>Memahami SubQuery dengan mengenali contoh tradisional Halo Dunia. Menggunakan proyek templat dari Docker, anda bisa dengan cepat memulai dan menjalankan node dan mulai query blockchain dalam beberapa menit saja menggunakan perintah sederhana.
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
            <span>Jaringan SubQuery</span>
            <p>Masa depan terdesentralisasi SubQuery. Cari tahu lebih lanjut tentang bagaimana indexer dan konsumen bisa mendapat hadiah.</p>
          </div>
        </a>
      </li>
    </ul>
  </div>
</div>
<section class="faqSection main">
  <div>
    <h2 class="title">Pertanyaan Umum</h2>
    <ul class="faqList">
      <li>
        <div class="title">Apa itu SubQuery?</div>
        <div class="content">
          <p>SubQuery adalah proyek open source yang memungkinkan developer untuk mengindeks, mengubah, dan melakukan query Substrate data chain untuk mentenagai aplikasi mereka.</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">Apa cara terbaik untuk memulai SubQuery?</div>
        <div class="content">
          <p>The best way to get started with SubQuery is to try out our <a href="/quickstart/helloworld-localhost/">Hello World tutorial</a>. Ini adalah tutorial 5 menit yang simpel berisikan pengunduhan templat, membangun proyek, kemudian menggunakan Docker untuk menjalankan node di localhost dan menjalankan query yang sederhana. </p>
        </div>
      </li>
      <li>
        <div class="title">Bagaimana saya bisa berkontribusi atau memberi masukan ke SubQuery?</div>
        <div class="content">
          <p>Kami sangat menghargai kontribusi dan masukan dari komunitas. Untuk mengkontribusi kode, fork repositori yang menarik dan buat perubahan yang anda inginkan. Lalu kirimkan PR atau Pull Request. Oh, jangan lupa untuk mengetesnya dulu! Periksa juga panduan kontribusi kami (segera hadir). </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">Berapa biaya untuk hosting proyek saya di SubQuery Projects?</div>
        <div class="content">
          <p>Hosting proyek anda di SubQuery Projects sepenuhnya gratis - ini adalah cara kami untuk memberi kembali kepada komunitas kami. To learn how to host your project with us, please check out the <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery Hosted)</a> tutorial.</p>
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
        <h5>Mengintegrasi Custom Chain anda?</h5>
        <p>Baik anda sedang membangun parachain baru atau blockchain baru di Substrate - SubQuery bisa membantu anda mengindeks dan menyelesaikan masalah di data chain anda. SubQuery didesain agar mudah diintegrasi dengan custom Substrate chain.</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">LEARN HOW TO INTEGRATE WITH YOUR CHAIN</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>Dukung dan Kontribusi</h5>
        <p>Punya pertanyaan atau berminat untuk cari tahu cara anda bisa berkontribusi? Kami dengan senang hati akan menjawab anda. Silakan hubungi kami via email atau media sosial dari tautan di bawah. Butuh ahli teknis? Gabung komunitas Discord kami dan dapatkan bantuan dari anggota komunitas kami. </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">GABUNG PERBINCANGAN DI DISCORD</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>Hubungi kami</span>
    <a href="mailto:hello@subquery.network">hello@subquery.network</a>
  </div>
  <div>
    <div>Ikuti kami di socialbn</div>
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

<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">Welcome to SubQuery’s <span>Docs</span></h2>
        <p>Sezgisel dApp'leri daha hızlı oluşturmak için zincir verilerinizi keşfedin ve dönüştürün!</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title">Hızlı Başlangıç <span>Guide</span></h2>
      <p>Geleneksel bir Hello World örneğiyle el ele tutuşarak SubQuery'i anlayın. Docker ortamındaki bir şablon projesini kullanarak, hızlı bir şekilde bir düğüm çalıştırabilir ve birkaç basit komutla birkaç dakika içinde bir blok zincirini sorgulamaya başlayabilirsiniz.
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
            <span>Öğreticiler ve Örnekler</span>
            <p>Yaparak öğren. Çeşitli SubQuery projeleri oluşturma hakkında öğreticiler ve örnekler.</p>
          </div>
        </router-link>
      </li>
      <li>
        <router-link :to="{path: '/create/introduction/'}">
          <div>
            <img src="/assets/img/docsIcon.svg" />
            <span>Teknik Başvuru Belgeleri</span>
            <p>Geliştiriciler için geliştiriciler tarafından yazılmıştır. Harika dApp'leri hızlı bir şekilde oluşturmak için ihtiyacınız olanı bulun.</p>
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
    <h2 class="title">FAQ</h2>
    <ul class="faqList">
      <li>
        <div class="title">SubQuery nedir?</div>
        <div class="content">
          <p>SubQuery, geliştiricilerin uygulamalarını güç sağlamak için Substrat zinciri verilerini dizine almalarına, dönüştürmelerine ve sorgulamalarına olanak tanıyan açık kaynaklı bir projedir.</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">SubQuery'ye başlamanın en iyi yolu nedir?</div>
        <div class="content">
          <p>SubQuery'yi kullanmaya başlamanın en iyi yolu, <a href="/quickstart/helloworld-localhost/">Hello World tutorial</a> denemektir. Bu, başlangıç şablonunu indirme, projeyi oluşturma ve ardından localhost'unuzda bir düğüm çalıştırmak ve basit bir sorgu çalıştırmak için Docker'ı kullanma konusunda basit bir 5 dakikalık yürüme mesafesindedir. </p>
        </div>
      </li>
      <li>
        <div class="title">SubQuery'ye nasıl katkıda bulunabilir veya geri bildirimde bulunabilirim?</div>
        <div class="content">
          <p>Topluluktan gelen katkıları ve geri bildirimleri seviyoruz. Koda katkıda bulunmak için, ilgi alanı deponuzu çatallayın ve değişikliklerinizi yapın. Ardından bir PR veya Çekme İsteği gönderin. Test etmeyi de unutma! Ayrıca katkı yönergelerimize de göz atın (yakında). </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">Projemi SubQuery Projelerinde barındırmanın maliyeti nedir?</div>
        <div class="content">
          <p>Projenizi SubQuery Projects'te barındırmak tamamen ücretsizdir - bu bizim topluma geri verme yöntemimizdir. Projenizi bizimle nasıl barındıracaklarınızı öğrenmek için lütfen <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery Hosted)</a> öğreticisine göz atın.</p>
          <span class="more">
            <router-link :to="{path: '/publish/publish/'}">HOSTING YOUR PROJECT</router-link>
          </span>
        </div>
      </li>
    </ul><br>
    Daha sık sorulan diğer sorular için lütfen <router-link :to="{path: '/faqs/faqs/'}">FAQ's</router-link> sayfamıza bakın.    
  </div>
</section>
<section class="main">
  <div>
    <div class="lastIntroduce lastIntroduce_1">
        <h5>Özel Zinciriniz ile entegre misiniz?</h5>
        <p>İster Substrate'de yeni bir parachain ister tamamen yeni bir blok zinciri oluşturuyor olun - SubQuery zincirinizin verilerini dizine almanıza ve sorun gidermenize yardımcı olabilir. SubQuery, özel bir Substrat tabanlı zincirle kolayca entegre olacak şekilde tasarlanmıştır.</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">LEARN HOW TO INTEGRATE WITH YOUR CHAIN</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>Destek ve Katkıda Bulun</h5>
        <p>Bir sorunuz mu var veya daha fazlasını veya nasıl katkıda bulunabileceğinizi öğrenmek mi istersiniz? Sizden haber almak isteriz. Lütfen aşağıdaki bağlantılardan e-posta veya sosyal medya aracılığıyla bizimle iletişime geçin. Teknik uzmanlığa mı ihtiyacınız var? Discord topluluğumuza katılın ve tutkulu topluluk üyelerimizden destek alın. </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">DISCORD'DA SOHBETE KATıLıN</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>Contact us</span>
    <a href="mailto:hello@subquery.network">hello@subquery.network</a>
  </div>
  <div>
    <div>Bizi socialbn'de takip edin</div>
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

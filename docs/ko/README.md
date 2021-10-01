<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">서브쿼리의 <span>문서</span>에 오신 것을 환영합니다.</h2>
        <p>체인 데이터를 탐색하고 변환하여 직관적인 디앱을 더 빠르게 구축해보십시오!</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title">빠른시작 <span>가이드</span></h2>
      <p>가장 쉬운 Hello World 예제를 통해 서브쿼리를 이해해보세요. Docker 환경 내에서 템플릿 프로젝트를 사용하면 몇 가지 간단한 커맨드로 단 몇 분 만에 노드를 신속하게 시작, 실행하고 블록체인 쿼리를 시작할 수 있습니다.
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
             <span>서브쿼리 네트워크</span>
             <p>서브쿼리의 탈중앙화된 미래. 인덱서와 소비자가 보상을 받는 방식에 대해서 자세히 알아보세요.</p>
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
        <div class="title">서브쿼리란?</div>
        <div class="content">
          <p>서브쿼리는 개발자가 서브스트레이트 체인 데이터를 인덱싱, 변환 및 쿼리하여 애플리케이션을 구동할 수 있도록 하는 오픈 소스 프로젝트입니다.</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">서브쿼리를 시작하는 가장 좋은 방법은 무엇입니까?</div>
        <div class="content">
          <p>The best way to get started with SubQuery is to try out our <a href="/quickstart/helloworld-localhost/">Hello World tutorial</a>. 쿼리를 실행하는 과정을 5분 만에 쉽게 구동할 수 있습니다. 일단 스타트 템플릿을 다운로드하고 프로젝트를 빌드한 다음, Docker를 이용하여 로컬 호스트에서 노드를 실행합니다. </p>
        </div>
      </li>
      <li>
        <div class="title">서브쿼리에 기여하거나 피드백을 어떻게 제공하나요?</div>
        <div class="content">
          <p>우리는 언제나 커뮤니티의 기여와 피드백을 환영합니다. 코드를 피드백을 하려면 관심 있는 레포지토리를 포크하고 변경합니다. 그런 다음 PR 또는 풀 리퀘스트를 통해 제출해주세요. 맞다! 테스트도 잊지 마시구요! 또한 기여를위한 가이드(곧 제공될 예정입니다) 도 확인해주세요. </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">READ MORE</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">서브쿼리 프로젝트에서 내 프로젝트를 호스팅하는 데 비용이 얼마나 듭니까?</div>
        <div class="content">
          <p>서브쿼리 프로젝트에서 프로젝트를 호스팅하는 비용은 무료입니다! 이것이 저희가 커뮤니티에 보답하는 방법입니다! To learn how to host your project with us, please check out the <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery Hosted)</a> tutorial.</p>
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
        <h5>커스텀 체인과 통합하시겠습니까?</h5>
        <p>새로운 파라체인을 구축하든, 서브스트레이트에 완전히 새로운 블록체인을 구축하든 서브쿼리는 체인 데이터를 색인화하고 문제를 해결하는 데 큰 도움이 됩니다. 또한 서브쿼리는 서브스트레이트 기반의 커스텀 체인과 쉽게 통합되도록 설계되었습니다.</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">LEARN HOW TO INTEGRATE WITH YOUR CHAIN</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>지원 및 기여</h5>
        <p>어떠한 질문이 있거나, 더 자세히 알고 싶거나 또는 기여하고 싶다면 어떻게 해아하나요? 저희는 여러분의 의견을 듣고 싶습니다. 아래에 게시된 링크에서 이메일이나 소셜 미디어를 통해 문의해주세요. 전문적인 기술 지원이 필요하십니까? 디스코드 커뮤니티에 가입하고 열정적인 커뮤니티 구성원들에게 지원을 받아보세요. </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">디스코드 커뮤니티에 참여하세요</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>문의 메일</span>
    <a href="mailto:hello@subquery.network">hello@subquery.network</a>
  </div>
  <div>
    <div>소셜미디어</div>
    <div class="connectWay">
      <a href="https://discord.com/invite/78zg8aBSMG" target="_blank" class="connectDiscord">디스코드</a>
      <a href="https://twitter.com/subquerynetwork" target="_blank" class="connectTwitter">트위터</a>
      <a href="https://medium.com/@subquery" target="_blank" class="connectMedium">미디움</a>
      <a href="https://t.me/subquerynetwork" target="_blank" class="connectTelegram">텔레그램</a>
      <a href="https://github.com/OnFinality-io/subql" target="_blank" class="connectGithub">깃허브</a>
      <a href="https://matrix.to/#/#subquery:matrix.org" target="_blank" class="connectMatrix">매트릭스</a>
      <a href="https://www.linkedin.com/company/subquery" target="_blank" class="connectLinkedin">링크드인</a>
    </div>
  </div>
</section>
</div> </div>
<div class="footer">
  <div class="main"><div>서브쿼리 © 2021</div></div>
</div>
<script charset="utf-8" src="/assets/js/welcome.js"></script>

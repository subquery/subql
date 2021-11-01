<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">SubQueryの <span>ドキュメント</span>へようこそ</h2>
        <p>直感的なdAppsをより速く構築するために、チェーンデータを探索して変換しましょう！</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title">クイックスタート <span>ガイド</span></h2>
      <p>SubQueryを理解するために、従来のHello Worldの例を使います。 Docker 環境内でのテンプレート プロジェクトの使用して、いくつかの簡単なコマンドですぐにノードを起動して実行し、わずか数分でブロックチェーンのクエリを開始できます。
      </p>
      <span class="button">
        <router-link :to="{path: '/quickstart/helloworld-localhost/'}">
          <span>始めてみましょう</span>
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
            <span>チュートリアルと使用例</span>
            <p>実践で学ぶ。 様々な SubQuery プロジェクトをビルドする方法についてのチュートリアルと使用例。</p>
          </div>
        </router-link>
      </li>
      <li>
        <router-link :to="{path: '/create/introduction/'}">
          <div>
            <img src="/assets/img/docsIcon.svg" />
            <span>技術参考ドキュメント</span>
            <p>開発者向けに書かれています。 素晴らしいdAppsを素早く構築するために必要なものを見つけましょう。</p>
          </div>
        </router-link>
      </li>
      <li>
        <a href="https://static.subquery.network/whitepaper.pdf" target="_blank">
          <div>
            <img src="/assets/img/networkIcon.svg" />
            <span>SubQuery Network</span>
            <p>SubQueryの分散型未来。 インデックス作成者と消費者がどのように報酬を与えられるかについての詳細をご覧ください。</p>
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
        <div class="title">SubQueryとは?</div>
        <div class="content">
          <p>SubQueryは開発者がSubstrateチェーンのデータにインデックスを付け、変換し、クエリを実行して、アプリケーションを強化するためのオープンソースプロジェクトです。</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">続きを読む</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">SubQueryを始めるための最良の方法は何ですか?</div>
        <div class="content">
          <p>SubQueryを始める最良の方法は、 <a href="/quickstart/helloworld-localhost/">Hello Worldチュートリアル</a> を試してみることです。 これはスターターテンプレートをダウンロードし、プロジェクトを構築するための簡単な5分です。 次にDocker を使用して、localhost上でノードを実行し、単純なクエリを実行します。 </p>
        </div>
      </li>
      <li>
        <div class="title">SubQueryにどのように貢献したりフィードバックを与えたりできますか?</div>
        <div class="content">
          <p>私たちはコミュニティからの貢献とフィードバックが大好きです。 コードに貢献するためには、関心のあるリポジトリをフォークして変更を加えます。 次にPRまたはPullリクエストを送信します。 ああ、テストすることを忘れないでください! 私たちの貢献ガイドラインもチェックしてください(近日公開)。 </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">続きを読む</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">自分のプロジェクトをSubQuery Projectsで公開するにはどのくらいの費用がかかりますか？</div>
        <div class="content">
          <p>SubQuery Projectsであなたのプロジェクトを公開することは完全に無料です - それはコミュニティに還元する私たちの方法です。 プロジェクトを公開する方法については、 <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery Hosted)</a> チュートリアルをご覧ください。</p>
          <span class="more">
            <router-link :to="{path: '/publish/publish/'}">プロジェクトを公開する</router-link>
          </span>
        </div>
      </li>
    </ul><br>
    さらによくある質問については、こちらをご覧ください。 <router-link :to="{path: '/faqs/faqs/'}">FAQ</router-link> ページ    
  </div>
</section>
<section class="main">
  <div>
    <div class="lastIntroduce lastIntroduce_1">
        <h5>カスタムチェーンと統合しますか？</h5>
        <p>新しいparachainを構築する場合でも、全く新しいブロックチェーンをSubstrate上で構築する場合でも、SubQueryはインデックスを作成し、チェーンのデータをトラブルシューティングするのに役立ちます。 SubQuery は Substrate ベースのカスタムチェーンと簡単に統合できるように設計されています。</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">あなたのチェーンとの統合方法を学ぶ</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>サポートと貢献</h5>
        <p>ご質問がある方、もっと詳しく知りたい方、どのように貢献できるか興味がある方は、こちらをご覧ください。 ご連絡をお待ちしています！ 以下のリンクからメールまたはソーシャルメディアでお問い合わせください。 技術的専門知識が必要ですか？ Discordコミュニティに参加して、情熱的なコミュニティメンバーからサポートを受けてください。 </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">Discordで会話に参加</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>お問い合わせ</span>
    <a href="mailto:hello@subquery.network">hello@subquery.network</a>
  </div>
  <div>
    <div>ソーシャルメディアでフォロー</div>
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

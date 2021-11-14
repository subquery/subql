# よくある質問

## SubQueryとは?

SubQueryは開発者がSubstrateチェーンのデータにインデックスを付け、変換し、クエリを実行して、アプリケーションを強化するためのオープンソースプロジェクトです。

また、SubQueryは開発者向けにプロジェクトの高品質のホスティングを無料で提供しているため、インフラ管理の責任を負うことなく、開発者はビルドに最善を尽くす事ができます。

## SubQueryを始めるための最良の方法は何ですか?

SubQueryを始める最良の方法は、 [Hello Worldチュートリアル](../quickstart/helloworld-localhost.md) を試してみることです。 これはスターターテンプレートをダウンロードし、プロジェクトを構築するための簡単な5分です。 次にDocker を使用して、localhost上でノードを実行し、単純なクエリを実行します。

## SubQueryに貢献したりフィードバックを与えたりするにはどうすればいいですか?

私たちはコミュニティからの貢献とフィードバックが大好きです。 コードに貢献するためには、関心のあるリポジトリをフォークして変更を加えます。 次にPRまたはPullリクエストを送信します。 ああ、テストすることを忘れないでください! 私たちの貢献ガイドラインもチェックしてください(近日公開)。

フィードバックをいただくには、hello@subquery.network までお問い合わせいただくか、 [discordチャンネル](https://discord.com/invite/78zg8aBSMG)に参加してください。

## 自分のプロジェクトをSubQuery Projectsで公開するにはどのくらいの費用がかかりますか？

SubQuery Projectsであなたのプロジェクトを公開することは完全に無料です - それはコミュニティに還元する私たちの方法です。 プロジェクトを公開する方法については、 [Hello World (SubQuery Hosted)](../quickstart/helloworld-hosted.md) チュートリアルをご覧ください。

## デプロイスロットとは何ですか？

デプロイスロットは、 [SubQuery Projects](https://project.subquery.network) の開発環境と同等の機能です。 例えば、ソフトウェアを扱う組織では、最低でも通常、開発環境と本番環境が存在します（localhostは無視します）。 Typically additional environments such as staging and pre-prod or even QA are included depending on the needs of the organisation and their development set up.

SubQuery currently has two slots available. A staging slot and a production slot. This allows developers to deploy their SubQuery to the staging environment and all going well, "promote to production" at the click of a button.

## What is the advantage of a staging slot?

The main benefit of using a staging slot is that it allows you to prepare a new release of your SubQuery project without exposing it publicly. You can wait for the staging slot to reindex all data without affecting your production applications.

The staging slot is not shown to the public in the [Explorer](https://explorer.subquery.network/) and has a unique URL that is visible only to you. And of course, the separate environment allows you to test your new code without affecting production.

## What are extrinsics?

If you are already familiar with blockchain concepts, you can think of extrinsics as comparable to transactions. More formally though, an extrinsic is a piece of information that comes from outside the chain and is included in a block. There are three categories of extrinsics. They are inherents, signed transactions, and unsigned transactions.

Inherent extrinsics are pieces of information that are not signed and only inserted into a block by the block author.

Signed transaction extrinsics are transactions that contain a signature of the account that issued the transaction. They stands to pay a fee to have the transaction included on chain.

Unsigned transactions extrinsics are transactions that do not contain a signature of the account that issued the transaction. Unsigned transactions extrinsics should be used with care because there is nobody paying a fee, becaused it is signed. Because of this, the transaction queue lacks economic logic to prevent spam.

For more information, click [here](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics).

## What is the endpoint for the Kusama network?

The network.endpoint for the Kusama network is `wss://kusama.api.onfinality.io/public-ws`.

## What is the endpoint for the Polkadot mainnet network?

The network.endpoint for the Polkadot network is `wss://polkadot.api.onfinality.io/public-ws`.

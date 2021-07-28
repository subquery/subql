# Frequently Asked Questions

## What is SubQuery?

SubQuery is an open source project that allows developers to index, transform, and query Substrate chain data to power their applications.

SubQuery also provides free, production grade hosting of projects for developers removing the responsiblity of manging infrastructure, and letting developers do what they do best - build.

## What is the best way to get started with SubQuery?

The best way to get started with SubQuery is to try out our [Hello World tutorial](../quickstart/helloworld-localhost.md). This is a simple 5 min walk through of downloading the starter template, building the project, and then using Docker to run a node on your localhost and running a simple query. 

## How can I contribute or give feedback to SubQuery?

We love contributions and feedback from the community. To contribute code, fork the repository of interest and make your changes. Then submit a PR or Pull Request. Oh, don't forget to test as well! Also check out our contributions guide lines (TBA). 

To give feedback, contact us at hello@subquery.network or jump onto our [discord channel](https://discord.com/invite/78zg8aBSMG)

## How much does it cost to host my project in SubQuery Projects? 

Hosting your project in SubQuery Projects is absolutely free - it's is our way of giving back to the community. To learn how to host your project with us, please check out the [Hello World (SubQuery hosted)](../quickstart/helloworld-hosted.md) tutorial.

## What are deployment slots? 

Deployment slots are a feature in [SubQuery Projects](https://project.subquery.network) that is the equivalent of a development environment. For example, in any software organisation there is normally a development environment and a production environment as a minimum (ignoring localhost that is). Typically additional environments such as staging and pre-prod or even QA are included depending on the needs of the organisation and their development set up. 

SubQuery currently has two slots available. A staging slot and a production slot. This allows developers to deploy their SubQuery to the staging environment and all going well, "promote to production" at the click of a button. 

## What is the advantage of a staging slot?

The main benefit of using a staging slot is that it allows you to prepare a new release of your SubQuery project without exposing it publicly. You can wait for the staging slot to reindex all data without affecting your production applications.

The staging slot is not shown to the public in the [Explorer](https://explorer.subquery.network/) and has a unique URL that is visible only to you. And of course, the separate environment allows you to test your new code without affecting production.

# What are extrinsics?

An extrinsic is a piece of information that comes from outside the chain and is included in a block. There are three categories of extrinsics. They are inherents, signed transactions, and unsigned transactions.

Inherent extrinsics are pieces of information that are not signed and only inserted into a block by the block author. 

Signed transaction extrinsics are transactions that contain a signature of the account that issued the transaction. They stands to pay a fee to have the transaction included on chain.

Unsigned transactions extrinsics are transactions that do not contain a signature of the account that issued the transaction. Unsigned transactions extrinsics should be used with care because there is nobody paying a fee, becaused it is signed. Because of this, the transaction queue lacks economic logic to prevent spam.

For more information, click [here](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics).
# Welcome!

![open grant logo](https://raw.githubusercontent.com/w3f/General-Grants-Program/master/src/badge_black.svg)

Welcome to SubQuery. A platform that enables better dApps by making decentralised data more accessible. SubQuery allows every Substrate/Polkadot team to process and query their data. The project is inspired by the growth of data protocols serving the application layer and it aims to help Polkadot/Substrate projects build better dApps by allowing anyone to reliably find and consume data faster. Today, anyone can query and extract Polkadot network data in only minutes and at no cost.

No matter what your background is, or what your technical abilities are, this site contains everything you need to enable you to start building and powering applications of the future. 

## Where to start?
The hardest stage when embarking on any journey is always the start. There is so much to learn, complicated acronyms to understand, and many new concepts to master. We understand this and have designed this guide with you in mind. 

## Understanding what SubQuery is
SubQuery is an open-source project that allows developers to index, transform, and query Substrate chain data to power their applications.

## Getting your feet wet

Get your feet wet by getting your hands on the traditional [Hello World](/quickstart/helloworld-localhost.md) tutorial where in around 5 minutes you should be able to perform a query to retrieve the blockheight of the mainnet Polkadot network.

## Install the SubQuery libraries

If you followed the Hello World tutorial, you will have already installed the SubQuery CLI. If you intend to do your development locally and not use Docker then you'll have to install the [SubQuery node and SubQuery query](/install/install.md) libraries. 

> Note: If you intend to use Docker or get SubQuery to host your project for you, then it won't be necessary to install the [SubQuery node and SubQuery query](/install/install.md) libraries. 

## Learning from examples

Once you have installed the required SubQuery libraries such as @subql/cli, @subql/node, or @subql/query, and you have gone through the [Hello World](../quickstart/helloworld-localhost.md) quick start guide, the next recommended step is to go through the [Tutorials and Examples](../tutorials_examples/introduction.md) to familiarise yourself with other projects and how you can tweak parts of these simple projects. 

## Creating your first project

Once you have garnered enough confidence or experience, you can then try your luck at creating a project. Creating a project involves mastering only a handful of commands such as `init`, `codegen`, and `build`.

## Deploying your project

Once you have your project created, this is where it can get a bit confusing purely because there are several options for you to deploy your project. In other words, getting it working. 

You have two main options. Either running your project locally or publishing it to SubQuery.

**[Running your project](/run/run.md)**

The first option here is to take the long road and **run** a node and a query service on your machine. This is ideal for seasoned professionals, or for those who have a bit of time on their hands and enjoy learning things from first principles. 

The second option is to use Docker and **run** everything in a container. This is a great option as it is much simpler than option 1 above and quicker to get up and running. You don't need to know Docker, but any previous experience would be advantageous. 

**[Publishing your project](/publish/publish.md)**

The third option is to **publish** your project to SubQuery Projects which offers free hosting and takes the complexity and overhead of hosting of your plate. 

In terms of learning, the recommended options are to using Docker in the first instance due to simplicity and speed, then learn about SubQuery Projects, and finally to extend your knowledge, to learn how to spin up nodes and query services individually on your local machine.

## Ask and you shall receive

Once you are comfortable running SubQuery projects in your deployment of choice, the next step is to become familiar with [querying your data](/query/query.md) using GraphQL.
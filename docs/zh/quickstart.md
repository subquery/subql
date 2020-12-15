# SubQuery - 初始包


The Starter Package is an example  that you can use as a starting point for developing your SubQuery project.
A subquery package defines which data The Subquery will index from the substrate network, and how it will store it. 

## 准备工作

#### Install the SubQuery CLI

Install Subquery CLI globally on your terminal by using Yarn or NPM:

```
$npm install -g @subql-cli
$yarn global add @subql-cli
```

Run help to see available commands and usage provide by CLI
```
$suqbl help
```

#### Initialize the starter package

Inside the folder in which you want to create the subquery project, and run this command:

```
$subql  init --starter
```
Then you should see a directory `subql-starter` has been created inside your folder, you can use this 
as the start point of your project. And the files should be identical as following:

```
- subql-starter
  L package.json
  L project.yaml
  L README.md
  L schema.graphql
  L tsconfig.json
  L src
    L index.ts
    L mappings
      L Extrinsic.ts
```
Last, under the `suql-starter` directory, run follow command to install all the dependency.
```
$npm install
```


## 配置项目

#### The Manifest

- Inside the `project.yaml`, defines the substrate extrinsic your subquery indexes, which events \ calls 
from these extrinsic to pay attention to, and how to map event data to entities that our hosted node will
stores and allows to query. 

#### The GraphQL Schema

- Next, you need to define the GraphQL schemas inside of `schema.graphql` file. To know how to write in  "GraphQL schema language",
we recommend to check out on [Schemas and Types](https://graphql.org/learn/schema/#type-language).

#### Mapping function

The mappings transform the substrate data your mappings are sourcing into entities defined in your schema. Mappings are written 
in a subset of TypeScript called AssemblyScript which can be compiled to WASM (WebAssembly). 

- We also provided an example of a mapping function in `src/mappings/Extrinsic.ts`. For each handler that is defined in `project.yaml`
under mapping.handlers, create an exported function of the same name. 

- Under the `src/index.ts`，you need to export the functions of handlers has defined in above.


#### Code generation

Next, run codegen command under your project root directory.

```
$subql codegen
```
- This will create a new directory `src/types` which contains all generate entities in AssemblyScript.
- Generate entity class for each types you have defined previously in `schema.graphql`. These classes provide type-safe 
entity loading, read and write access to entity fields.

## 部署项目

#### Pack and upload

In order to deploy your subquery project to our hosted service, it is mandatory to pack your configuration before upload.
Run pack comand from npm from root directory of your project will automatically generate a `your-project-name.tgz` file.

```
$npm pack
```

Last, all you need to do is upload this file to our host. 
All good to go.

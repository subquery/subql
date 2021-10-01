# Hızlı Başlangıç Kılavuzu

Bu Hızlı Başlangıç kılavuzunda, kendi SubQuery Projenizi geliştirmek için bir çerçeve olarak kullanılabilecek basit bir başlangıç projesi oluşturacağız.

Bu kılavuzun sonunda, verileri sorguyabileceğiniz bir GraphQL uç noktasına sahip bir SubQuery düğümünde çalışan çalışan bir SubQuery projeniz olacaktır.

Henüz yapmadıysanız, SubQuery'de kullanılan [terminology](../#terminology) hakkında bilgi sahibi > öneririz.

## Hazırlık

### Yerel Kalkınma Ortamı

- [Typescript](https://www.typescriptlang.org/), projeyi derlemek ve türleri tanımlamak için gereklidir.
- Hem SubQuery CLI hem de oluşturulan Project bağımlılıkları vardır ve modern bir sürüm [Node](https://nodejs.org/en/) gerektirir.
- SubQuery Nodes Docker gerektirir

### SubQuery CLI'sını yükleme

NPM kullanarak Terminalinize SubQuery CLI'yi genel olarak yükleyin:

```shell
# NPM
npm install -g @subql/cli
```

Lütfen **DO NOT**, zayıf bağımlılık yönetimi nedeniyle `yarn global` kullanımını teşvik ettiğimizi ve bunun da bir hataya yol açabileceğini unutmayın.

Daha sonra CLI tarafından sunulan kullanılabilir komutları ve kullanımı görmek için yardım çalıştırabilirsiniz

```shell
subql help
```

## Başlangıç SubQuery Projesini Başlatma

Bir SubQuery projesi oluşturmak istediğiniz dizinin içinde, `PROJECT_NAME` kendi projenizle değiştirin ve komutu çalıştırın:

```shell
subql init --starter PROJECT_NAME
```

SubQuery projesi initalised olarak size bazı sorular sorulana olacaktır:

- Git deposu (İsteğe Bağlı): Bu SubQuery projesinin barındırılacağı bir depoya Git URL'si sağlayın (SubQuery Gezgini'nde barındırıldığında)
- RPC uç noktası (Gerekli): Bu proje için varsayılan olarak kullanılacak çalışan bir RPC uç noktasına wss URL'si sağlayın. Farklı Polkadot ağları için genel uç noktalara hızlı bir şekilde erişebilir veya hatta [OnFinality](https://app.onfinality.io) kullanarak kendi özel özel düğümünüzü oluşturabilir veya yalnızca varsayılan Polkadot uç noktasını kullanabilirsiniz.
- Yazarlar (Gerekli): Bu SubQuery projesinin sahibini buraya girin
- Açıklama (İsteğe Bağlı): Projeniz hakkında hangi verileri içerdiğini ve kullanıcıların bu verilerle neler yapabileceğini açıklayan kısa bir paragraf sağlayabilirsiniz
- Sürüm (Gerekli): Özel bir sürüm numarası girin veya varsayılanı kullanın (`1.0.0`)
- Lisans (Gerekli): Bu proje için yazılım lisansını sağlayın veya varsayılanı kabul edin (`Apache-2.0`)

Başlatma işlemi tamamlandıktan sonra, dizin içinde proje adınızın oluşturulduğu bir klasör görmeniz gerekir. Bu directoy'un içeriği [Directory Structure](../create/introduction.md#directory-structure) listelenenlerle aynı olmalıdır.

Son olarak, proje dizini altında, yeni projenin bağımlılıklarını yüklemek için aşağıdaki komutu çalıştırın.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell cd PROJECT_NAME yarn install ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash cd PROJECT_NAME npm install ``` </CodeGroupItem> </CodeGroup>

## Configure and Build the Starter Project

In the starter package that you just initialised, we have provided a standard configuration for your new project. You will mainly be working on the following files:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

For more information on how to write your own SubQuery, check out our documentation under [Create a Project](../create/introduction.md)

### GraphQL Model Generation

In order to [index](../run/run.md) your SubQuery project, you must first generate the required GraphQL models that you have defined in your GraphQL Schema file (`schema.graphql`). Run this command in the root of the project directory.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn codegen ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script codegen ``` </CodeGroupItem> </CodeGroup>

You'll find the generated models in the `/src/types/models` directory

## Build the Project

In order run your SubQuery Project on a locally hosted SubQuery Node, you need to build your work.

Run the build command from the project's root directory.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

## Running and Querying your Starter Project

Although you can quickly publish your new project to [SubQuery Projects](https://project.subquery.network) and query it using our [Explorer](https://explorer.subquery.network), the easiest way to run SubQuery nodes locally is in a Docker container, if you don't already have Docker you can install it from [docker.com](https://docs.docker.com/get-docker/).

[_Skip this and publish your new project to SubQuery Projects_](../publish/publish.md)

### Run your SubQuery Project

All configuration that controls how a SubQuery node is run is defined in this `docker-compose.yml` file. For a new project that has been just initalised you won't need to change anything here, but you can read more about the file and the settings in our [Run a Project section](../run/run.md)

Under the project directory run following command:

```shell
docker-compose pull && docker-compose up
```

It may take some time to download the required packages ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query), and Postgres) for the first time but soon you'll see a running SubQuery node.

### Query your Project

Open your browser and head to [http://localhost:3000](http://localhost:3000).

You should see a GraphQL playground is showing in the explorer and the schemas that are ready to query. On the top right of the playground, you'll find a _Docs_ button that will open a documentation draw. This documentation is automatically generated and helps you find what entities and methods you can query.

For a new SubQuery starter project, you can try the following query to get a taste of how it works or [learn more about the GraphQL Query language](../query/graphql.md).

```graphql
{
  query {
    starterEntities(first: 10) {
      nodes {
        field1
        field2
        field3
      }
    }
  }
}
```

## Next Steps

Congratulations, you now have a locally running SubQuery project that accepts GraphQL API requests for sample data. In the next guide, we'll show you how to publish your new project to [SubQuery Projects](https://project.subquery.network) and query it using our [Explorer](https://explorer.subquery.network)

[Publish your new project to SubQuery Projects](../publish/publish.md)

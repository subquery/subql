# Hello World Açıklandı

[Hello World hızlı başlangıç kılavuzunda](helloworld-localhost.md), bazı basit komutları çalıştırdık ve çok hızlı bir şekilde bir örnek aldık. Bu, tüm önkoşulların yerinde olduğundan ve SubQuery'den ilk verilerinizi almak için basit bir sorgu yapmak için yerel bir oyun alanı kullanabileceğinizden emin olmanızı sağlar. Burada, tüm bu komutların ne anlama geldiğine daha yakından bakıyoruz.

## subql init

Çalıştırdığımız ilk komut `subql init --starter subqlHelloWorld` idi.

Bu ağır kaldırma yapar ve sizin için bir sürü dosya oluşturur. [official documentation](quickstart.md#configure-and-build-the-starter-project) belirtildiği gibi, esas olarak aşağıdaki dosyalar üzerinde çalışacaksınız:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

![key subql files](/assets/img/main_subql_files.png)

Bu dosyalar yaptığımız her şeyin özü. Bu nedenle, başka bir makalede bu dosyalara daha fazla zaman ayıracağız. Şimdilik, şemanın kullanıcıların SubQuery API'sinden isteyebileceği verilerin bir açıklamasını, "yapılandırma" türü parametrelerini içeren proje yaml dosyasını ve elbette verileri dönüştüren işlevleri içeren typescript içeren mappingHandlers'ı içerdiğini bilin.

## yarn install

The next thing we did was `yarn install`. `npm install` can be used as well.

> A short history lesson. Node Package Manager or npm was initially released in 2010 and is a tremendously popular package manager among JavaScript developers. It is the default package that is automatically installed whenever you install Node.js on your system. Yarn was initially released by Facebook in 2016 with the intention to address some of the performance and security shortcomings of working with npm (at that time).

What yarn does is look at the `package.json` file and download various other dependencies. Looking at the `package.json` file, it doesn't look like there are many dependencies, but when you run the command, you'll notice that 18,983 files are added. This is because each dependency will also have its own dependencies.

![key subql files](/assets/img/dependencies.png)

## yarn codegen

Then we ran `yarn codegen` or `npm run-script codegen`. What this does is fetch the GraphQL schema (in the `schema.graphql`) and generates the associated typescript model files (Hence the output files will have a .ts extension). You should never change any of these generated files, only change the source `schema.graphql` file.

![key subql files](/assets/img/typescript.png)

## yarn build

`yarn build` or `npm run-script build` was then executed. This should be familiar for seasoned programmers. It creates a distribution folder performing things such as code optimisation preparing for a deployment.

![key subql files](/assets/img/distribution_folder.png)

## docker-compose

The final step was the combined docker command `docker-compose pull && docker-compose up` (can be run separately as well). The `pull` command grabs all the required images from Docker Hub and the `up` command starts the container.

```shell
> docker-compose pull
Pulling postgres        ... done
Pulling subquery-node   ... done
Pulling graphql-engine  ... done
```

When the container is started, you'll see the terminal spit out lots of text showing the status of the node and the GraphQL engine. It's when you see:

```
subquery-node_1   | 2021-06-06T02:04:25.490Z <fetch> INFO fetch block [1, 100]
```

that you know that the SubQuery node has started to synchronise.

## Summary

Now that you've had an insight into what is happening under the covers, the question is where to from here? If you are feeling confident, you can jump into learning about how to [create a project](../create/introduction.md) and learn more about the three key files. The manifest file, the GraphQL schema, and the mappings file.

Otherwise, continue to our tutorials section where we look at how we can run this Hello World example on SubQuery's hosted infrastructure, we'll look at modifying the start block, and we'll take a deeper dive at running SubQuery projects by running readily available and open source projects.

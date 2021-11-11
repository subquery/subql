# SubQuery'i Kurmak

Bir SubQuery projesi oluştururken gerekli olan bazı bileşenler var. The [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) tool is used to create SubQuery projects. Bir dizin oluşturucuyu çalıştırmak için [@subql/node](https://github.com/subquery/subql/tree/docs-new-section/packages/node) bileşeni gereklidir. Sorguları oluşturmak için [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query) kütüphanesi gereklidir.

## @subql/cli'yi kurun

The [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) tool helps to create a project framework or scaffold meaning you don't have to start from scratch.

Yarn veya NPM kullanarak SubQuery CLI'yi global biçimde terminalinize kurun:

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn global add @subql/cli ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm install -g @subql/cli ``` </CodeGroupItem> </CodeGroup>

Ardından, CLI tarafından sağlanan kullanılabilir komutları ve kullanım biçimlerini görüntülemek için help komutunu çalıştırabilirsiniz:

```shell
subql help
```
## @subql/node'u kurun

Bir SubQuery node'u, SubQuery projesindeki alt-tabanlı blok zinciri verilerini çıkaran ve bir Postgres veritabanına kaydeden bir uygulamadır.

Yarn veya NPM kullanarak SubQuery node'unu global biçimde terminalinize kurun:

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn global add @subql/node ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm install -g @subql/node ``` </CodeGroupItem> </CodeGroup>

Kurulduktan sonra, aşağıdaki şekilde bir node başlatabilirsiniz:

```shell
subql-node <command>
```
> Not: Docker kullanıyorsanız veya projenizi SubQuery Projelerinde barındırıyorsanız, bu adımı atlayabilirsiniz. Bunun nedeni, SubQuery node'unun Docker konteynerında ve barındırma altyapısında zaten sağlanmış olmasıdır.

## @subql/query'yi kurun

SubQuery sorgu kütüphanesi, projenizi tarayıcınız aracılığıyla bir "çalışma alanı" ortamında sorgulamanıza olanak tanıyan bir hizmet sunar.

Yarn veya NPM kullanarak SubQuery sorgusunu global biçimde terminalinize kurun:

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn global add @subql/query ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm install -g @subql/query ``` </CodeGroupItem> </CodeGroup>

> Not: Docker kullanıyorsanız veya projenizi SubQuery Projelerinde barındırıyorsanız, bu adımı atlayabilirsiniz. Bunun nedeni, SubQuery node'unun Docker konteynerında ve barındırma altyapısında zaten sağlanmış olmasıdır. 
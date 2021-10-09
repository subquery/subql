# SubQuery Projenizi Yayımlama

## Projenizi SubQuery ile barındırmanın faydaları
- SubQuery projelerinizi sizin için yüksek performanslı, ölçeklenebilir ve yönetilen bir kamu hizmetinde çalıştıracağız
- Bu hizmet topluma ücretsiz olarak sağlanmaktadır!
- Projelerinizi herkese açık hale getirebilirsiniz, böylece [SubQuery Explorer](https://explorer.subquery.network) listelenir ve dünyanın herhangi bir yerinde herkes bunları görüntüleyebilir
- GitHub ile entegre olduk, böylece GitHub kuruluşlarınızdaki herkes paylaşılan organizasyon projelerini görüntüleyebilir

## İlk Projenizi Oluşturma

#### SubQuery Projelerine Giriş Yap

Başlamadan önce, lütfen SubQuery projenizin herkese açık bir GitHub deposunda çevrimiçi olduğundan emin olun. `schema.graphql` dosyası dizininizin kökünde olmalıdır.

İlk projenizi oluşturmak için [project.subquery.network](https://project.subquery.network) gidin. Giriş yapmak için GitHub hesabınızla kimlik doğrulamanız gerekir.

İlk girişte, SubQuery'yi yetkilendirmeniz istenecektir. Hesabınızı tanımlamak için yalnızca e-posta adresinize ihtiyacımız vardır ve GitHub hesabınızdaki başka hiçbir veriyi başka bir nedenle kullanmayız. Bu adımda, Kişisel hesabınız yerine GitHub Kuruluşunuz altında SubQuery projeleri yayınlayabilmeniz için GitHub Kuruluş hesabınıza erişim talep edebilir veya izin verebilirsiniz.

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

SubQuery Projeleri, SubQuery platformuna yüklenen barındırılan tüm projelerinizi yönettiğiniz yerdir. Bu uygulamadan projeler oluşturabilir, silebilir ve hatta yükseltebilirsiniz.

![Projects Login](/assets/img/projects-dashboard.png)

Bağlı bir GitHub Kuruluş hesabınız varsa, kişisel hesabınız ile GitHub Organization hesabınız arasında geçiş yapmak için üstbilgideki değiştiriciyi kullanabilirsiniz. GitHub Kuruluş hesabında oluşturulan projeler, bu GitHub Organizasyonu'ndaki üyeler arasında paylaşılır. GitHub Organization hesabınızı bağlamak için [buradaki adımları takip](#add-github-organization-account-to-subquery-projects) edebilirsiniz.

![Switch between GitHub accounts](/assets/img/projects-account-switcher.png)

#### İlk Projenizi Oluşturma

"Proje Oluştur"a tıklayarak başlayalım. Yeni Proje formuna alınacaksınız. Lütfen aşağıdakileri girin (bunu gelecekte değiştirebilirsiniz):
- **GitHub account:** Birden fazla GitHub hesabınız varsa, bu projenin hangi hesap altında oluşturulacağını seçin. GitHub kuruluş hesabında oluşturulan projeler bu kuruluştaki üyeler arasında paylaşılır.
- **Ad**
- **Altyazı**
- **Tarif**
- **GitHub Repository URL:** Bu, SubQuery projenize sahip bir ortak depo için geçerli bir GitHub URL'si olmalıdır. `schema.graphql` dosyası dizininizin kökünde olmalıdır ([de dizin yapısı hakkında daha fazla bilgi unun](../create/introduction.md#directory-structure)).
- **Hide projec:** Seçilirse, bu, projeyi genel SubQuery gezgininden gizler. SubQuerynuzu toplulukla paylaşmak istiyorsanız bunu seçimsiz tutun! ![Create your first Project](/assets/img/projects-create.png)

Projenizi oluşturursanız, SubQuery Projenizin listesinde görürsünüz. *Neredeyse geldik! Sadece yeni bir versiyonunu dağıtmamız gerekiyor.*

![Created Project with no deployment](/assets/img/projects-no-deployment.png)

#### İlk Sürümünüzü Dağıtma

Bir proje oluşturmak projenin görüntüleme davranışını ayarlarken, çalışmadan önce bir sürümünü dağıtmanız gerekir. Bir sürümü dağıtmak, yeni bir SubQuery dizin oluşturma işlemini başlatır ve GraphQL isteklerini kabul etmeye başlamak için gerekli sorgu hizmetini ayarlar. Yeni sürümleri varolan projelere de buradan dağıtabilirsiniz.

Yeni projenizde Deploy New Version düğmesi görürsünüz. Bunu tıklatın ve dağıtım hakkında gerekli bilgileri doldurun:
- **Yeni Sürüm'ün Karma'ını:** GitHub'dan, subquery proje kod tabanınızın dağıtılmasını istediğiniz sürümünün tam tamamlama karmasını kopyalayın
- **Dexer Sürümü:** Bu, SubQuery'yi çalıştırmak istediğiniz SubQuery düğüm hizmetinin sürümüdür. Bkz[`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **Query Sürümü:** Bu, Bu SubQuery'yu çalıştırmak istediğiniz SubQuery'nin sorgu hizmetinin sürümüdür. Bkz[`@subql/query`](https://www.npmjs.com/package/@subql/query)

![Deploy your first Project](https://static.subquery.network/media/projects/projects-first-deployment.png)

Başarıyla dağıtılırsa, dizinleyicinin çalışmaya başladığını görürsünüz ve geçerli zinciri dizine alma konusundaki ilerlemeyi raporlarsınız. Bu işlem %100'e ulaşana kadar zaman alabilir.

## Sonraki Adımlar - Projenize Bağlanın
Dağıtımınız başarıyla tamamlandıktan ve düğümlerimiz verilerinizi zincirden dizine ekledikten sonra, görüntülenen GraphQL Query uç noktası aracılığıyla projenize bağlanabilirsiniz.

![Project being deployed and synced](/assets/img/projects-deploy-sync.png)

Alternatively, you can click on the three dots next to the title of your project, and view it on SubQuery Explorer. There you can use the in-browser playground to get started - [read more about how to user our Explorer here](../query/query.md).

![Projects in SubQuery Explorer](/assets/img/projects-explorer.png)

## Add GitHub Organization Account to SubQuery Projects

It is common to publish your SubQuery project under the name of your GitHub Organization account rather than your personal GitHub account. At any point your can change your currently selected account on [SubQuery Projects](https://project.subquery.network) using the account switcher.

![Switch between GitHub accounts](/assets/img/projects-account-switcher.png)

If you can't see your GitHub Organization account listed in the switcher, the you may need to grant access to SubQuery for your GitHub Organization (or request it from an administrator). To do this, you first need to revoke permissions from your GitHub account to the SubQuery Application. To do this, login to your account settings in GitHub, go to Applications, and under the Authorized OAuth Apps tab, revoke SubQuery - [you can follow the exact steps here](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). **Don't worry, this will not delete your SubQuery project and you will not lose any data.**

![Revoke access to GitHub account](/assets/img/project_auth_revoke.png)

Once you have revoked access, log out of [SubQuery Projects](https://project.subquery.network) and log back in again. You should be redirected to a page titled *Authorize SubQuery* where you can request or grant SubQuery access to your GitHub Organization account. If you don't have admin permissions, you must make a request for an adminstrator to enable this for you.

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

Once this request has been approved by your administrator (or if are able to grant it youself), you will see the correct GitHub Organization account in the account switcher.
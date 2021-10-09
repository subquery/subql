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

![GitHub hesabından onayı iptal et](/assets/img/project_auth_request.png)

SubQuery Projeleri, SubQuery platformuna yüklenen barındırılan tüm projelerinizi yönettiğiniz yerdir. Bu uygulamadan projeler oluşturabilir, silebilir ve hatta yükseltebilirsiniz.

![Projelere Giriş](/assets/img/projects-dashboard.png)

Bağlı bir GitHub Kuruluş hesabınız varsa, kişisel hesabınız ile GitHub Organization hesabınız arasında geçiş yapmak için üstbilgideki değiştiriciyi kullanabilirsiniz. GitHub Kuruluş hesabında oluşturulan projeler, bu GitHub Organizasyonu'ndaki üyeler arasında paylaşılır. GitHub Organization hesabınızı bağlamak için [buradaki adımları takip](#add-github-organization-account-to-subquery-projects) edebilirsiniz.

![GitHub hesapları arasında geçiş yapma](/assets/img/projects-account-switcher.png)

#### İlk Projenizi Oluşturma

"Proje Oluştur"a tıklayarak başlayalım. Yeni Proje formuna alınacaksınız. Lütfen aşağıdakileri girin (bunu gelecekte değiştirebilirsiniz):
- **GitHub account:** Birden fazla GitHub hesabınız varsa, bu projenin hangi hesap altında oluşturulacağını seçin. GitHub kuruluş hesabında oluşturulan projeler bu kuruluştaki üyeler arasında paylaşılır.
- **Ad**
- **Altyazı**
- **Tarif**
- **GitHub Repository URL:** Bu, SubQuery projenize sahip bir ortak depo için geçerli bir GitHub URL'si olmalıdır. `schema.graphql` dosyası dizininizin kökünde olmalıdır ([de dizin yapısı hakkında daha fazla bilgi unun](../create/introduction.md#directory-structure)).
- **Hide projec:** Seçilirse, bu, projeyi genel SubQuery gezgininden gizler. SubQuerynuzu toplulukla paylaşmak istiyorsanız bunu seçimsiz tutun! ![İlk Projenizi oluşturma](/assets/img/projects-create.png)

Projenizi oluşturursanız, SubQuery Projenizin listesinde görürsünüz. *Neredeyse geldik! Sadece yeni bir versiyonunu dağıtmamız gerekiyor.*

![Dağıtım olmadan Oluşturulan Proje](/assets/img/projects-no-deployment.png)

#### İlk Sürümünüzü Dağıtma

Bir proje oluşturmak projenin görüntüleme davranışını ayarlarken, çalışmadan önce bir sürümünü dağıtmanız gerekir. Bir sürümü dağıtmak, yeni bir SubQuery dizin oluşturma işlemini başlatır ve GraphQL isteklerini kabul etmeye başlamak için gerekli sorgu hizmetini ayarlar. Yeni sürümleri varolan projelere de buradan dağıtabilirsiniz.

Yeni projenizde Deploy New Version düğmesi görürsünüz. Bunu tıklatın ve dağıtım hakkında gerekli bilgileri doldurun:
- **Yeni Sürüm'ün Karma'ını:** GitHub'dan, subquery proje kod tabanınızın dağıtılmasını istediğiniz sürümünün tam tamamlama karmasını kopyalayın
- **Dexer Sürümü:** Bu, SubQuery'yi çalıştırmak istediğiniz SubQuery düğüm hizmetinin sürümüdür. Bkz[`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **Query Sürümü:** Bu, Bu SubQuery'yu çalıştırmak istediğiniz SubQuery'nin sorgu hizmetinin sürümüdür. Bkz[`@subql/query`](https://www.npmjs.com/package/@subql/query)

![İlk Projenizi dağıtma](https://static.subquery.network/media/projects/projects-first-deployment.png)

Başarıyla dağıtılırsa, dizinleyicinin çalışmaya başladığını görürsünüz ve geçerli zinciri dizine alma konusundaki ilerlemeyi raporlarsınız. Bu işlem %100'e ulaşana kadar zaman alabilir.

## Sonraki Adımlar - Projenize Bağlanın
Dağıtımınız başarıyla tamamlandıktan ve düğümlerimiz verilerinizi zincirden dizine ekledikten sonra, görüntülenen GraphQL Query uç noktası aracılığıyla projenize bağlanabilirsiniz.

![Dağıtılan ve eşitlenen proje](/assets/img/projects-deploy-sync.png)

Alternatif olarak, projenizin başlığının yanındaki üç noktaya tıklayabilir ve SubQuery Gezgini'nden görüntüleyebilirsiniz. Burada başlamak için tarayıcı içi oyun alanını kullanabilirsiniz - [ Explorer'ımızı nasıl kullanacağınız hakkında daha fazla](../query/query.md).

![SubQuery Explorer Projeler](/assets/img/projects-explorer.png)

## GitHub Kuruluş Hesabını SubQuery Projelerine Ekleme

SubQuery projenizi kişisel GitHub hesabınız yerine GitHub Kuruluş hesabınızın adı altında yayımlamak yaygındır. İstediğiniz noktada, hesap değiştiriciyi kullanarak [SubQuery Projects](https://project.subquery.network)'da seçili hesabınızı değiştirebilirsiniz.

![GitHub hesapları arasında geçiş yapma](/assets/img/projects-account-switcher.png)

GitHub Kuruluş hesabınızı switcher'de listelenmiş olarak göremiyorsanız GitHub Kuruluşunuz için SubQuery'ye erişim izni vermeniz (veya bir yöneticiden istemeniz) gerekebilir. Bunu yapmak için öncelikle GitHub hesabınızdan SubQuery Uygulamasına olan izinleri iptal etmeniz gerekir. Bunu yapmak için GitHub'daki hesap ayarlarınıza giriş yapın, Uygulamalar'a gidin ve Yetkili OAuth Uygulamaları sekmesinin altında SubQueryyu iptal edin - [ buradan tam adımları izleyebilirsiniz](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). ** Endişelenmeyin, bu SubQuery projenizi silmez ve herhangi bir veri kaybetmezsiniz.**

![GitHub hesabına erişimi iptal etme](/assets/img/project_auth_revoke.png)

Erişimi iptal ettikten sonra, [SubQuery Projects](https://project.subquery.network) oturumunu kapatın ve yeniden oturum açın. GitHub Organization hesabınıza SubQuery erişimi isteyebileceğiniz veya verebileceğiniz *SubQuery Yetkilendir* başlıklı bir sayfaya yönlendirilmeniz gerekir. Yönetici izinleriniz yoksa, bunu sizin için etkinleştirmek için bir yönetici isteğinde bulunmalısınız.

![GitHub hesabından onayı iptal et](/assets/img/project_auth_request.png)

Bu istek yöneticiniz tarafından onaylandıktan sonra (veya size kendisi verebilirse), hesap değiştiricide doğru GitHub Organization hesabını görürsünüz.
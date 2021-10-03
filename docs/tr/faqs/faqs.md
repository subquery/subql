# Sıkça Sorulan Sorular

## SubQuery nedir?

SubQuery, geliştiricilerin uygulamalarını güç sağlamak için Substrat zinciri verilerini dizine almalarına, dönüştürmelerine ve sorgulamalarına olanak tanıyan açık kaynaklı bir projedir.

SubQuery ayrıca geliştiriciler için altyapıyı yönetme sorumluluğunu ortadan kaldıran ve geliştiricilerin en iyi yaptıkları şeyi, yani inşa etmelerini sağlayan ücretsiz, üretim düzeyinde proje barındırma hizmeti sağlar.

## SubQuery'ye başlamanın en iyi yolu nedir?

SubQuery'yi kullanmaya başlamanın en iyi yolu, [Hello World tutorial](../quickstart/helloworld-localhost.md) denemektir. Bu, başlangıç şablonunu indirme, projeyi oluşturma ve ardından localhost'unuzda bir düğüm çalıştırmak ve basit bir sorgu çalıştırmak için Docker'ı kullanma konusunda basit bir 5 dakikalık gözden geçirmedir.

## SubQuery'ye nasıl katkıda bulunabilir veya geri bildirimde bulunabilirim?

Topluluktan gelen katkıları ve geri bildirimleri seviyoruz. Koda katkıda bulunmak için, ilgi alanı deponuzu çatallayın ve değişikliklerinizi yapın. Ardından bir PR veya Çekme İsteği gönderin. Test etmeyi de unutma! Ayrıca katkı yönergelerimize de göz atın (yakında).

Geri bildirimde bulunmak için hello@subquery.network adresinden bizimle iletişime geçin veya [discord kanalımıza](https://discord.com/invite/78zg8aBSMG) gelin

## Projemi SubQuery Projelerinde barındırmanın maliyeti nedir?

Projenizi SubQuery Projects'te barındırmak tamamen ücretsizdir - bu bizim topluma geri verme yöntemimizdir. Projenizi bizimle nasıl barındıracaklarınızı öğrenmek için lütfen [Hello World (SubQuery Hosted)](../quickstart/helloworld-hosted.md) öğreticisine göz atın.

## Dağıtım yuvaları nelerdir?

Dağıtım yuvaları, bir geliştirme ortamına eşdeğer olan [SubQuery Projelerindeki](https://project.subquery.network) bir özelliktir. Örneğin, herhangi bir yazılım organizasyonunda normalde bir geliştirme ortamı ve minimum olarak bir üretim ortamı vardır (yani localhost yok sayılarak). Tipik olarak, organizasyonun ihtiyaçlarına ve geliştirme kurulumlarına bağlı olarak, aşamalandırma ve üretim öncesi ve hatta QA gibi ek ortamlar dahil edilir.

SubQuery şu anda kullanılabilir iki yuvaya sahiptir. Bir hazırlama yuvası ve bir üretim yuvası. Bu, geliştiricilerin SubQuery hazırlama ortamına dağıtmalarına ve her şey yolunda gidiyor, bir düğmeyi tıklatarak "üretime terfi etmelerine" olanak tanır.

## Bir hazırlama yuvasının avantajı nedir?

Hazırlama yuvası kullanmanın ana yararı, SubQuery projenizin yeni bir sürümünü herkese açık hale getirmeden hazırlamanıza olanak sağlamasıdır. Üretim uygulamalarınızı etkilemeden hazırlama yuvasının tüm verileri yeniden indekslemesini bekleyebilirsiniz.

Hazırlama yuvası, Explorer'da herkese gösterilmez ve yalnızca sizin görebileceğiniz benzersiz bir URL'ye sahiptir. Ve elbette, ayrı ortam, üretimi etkilemeden yeni kodunuzu test etmenize olanak tanır.

## Dışsallar nelerdir?

Blockchain kavramlarına zaten aşina iseniz, dışsalları işlemlerle karşılaştırılabilir olarak düşünebilirsiniz. Daha resmi olarak, dışsal, zincirin dışından gelen ve bir bloğa dahil edilen bir bilgi parçasıdır. Üç dışsal kategori vardır. Bunlar doğal, imzalı işlemler ve imzasız işlemlerdir.

İçsel dışsal bilgiler, imzalanmayan ve yalnızca blok yazarı tarafından bir bloğa eklenen bilgi parçalarıdır.

İmzalı işlem dışsal öğeleri, işlemi yapan hesabın imzasını içeren işlemlerdir. İşlemin zincire dahil edilmesi için bir ücret ödemeye hazırlar.

İmzalı işlem dışsal öğeleri, işlemi yapan hesabın imzasını içeren işlemlerdir. İmzasız işlemler, imzalı olduğu için ücret ödemeyen kimse olmadığı için dikkatli kullanılmalıdır. Bu nedenle, işlem kuyruğu spam'i önlemek için ekonomik mantıktan yoksundur.

Daha fazla bilgi için [buraya](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics) tıklayın.

## Kusama ağı için son nokta nedir?

Kusama ağının network.endpoint'i `wss://kusama.api.onfinality.io/public-ws`'dir.

## Polkadot ana ağ ağının bitiş noktası nedir?

Polkadot ağının network.endpoint'i `wss://polkadot.api.onfinality.io/public-ws`'dir.

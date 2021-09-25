# Hello World (hosting SubQuery)

Tujuan dari quick start ini adalah untuk menunjukkan bagaimana Anda dapat menjalankan proyek starter default pada SubQuery Projects (layanan terkelola kami) dengan beberapa langkah mudah.

Kita akan mengambil proyek starter sederhana (dan semua yang telah kami pelajari sejauh ini) tetapi alih-alih menjalankannya secara lokal pada Docker, kita akan memanfaatkan infrastruktur hosting SubQuery yang terkelola. Dengan kata lain, kita akan membiarkan SubQuery melakukan semua pekerjaan berat, menjalankan, dan mengelola infrastruktur produksi.

## Tujuan Pembelajaran

Pada akhir quick start ini, Anda harus:

- memahami prasyarat yang diperlukan
- bisa menghosting proyek pada [SubQuery Projects](https://project.subquery.network/)
- menjalankan kueri sederhana untuk mendapatkan tinggi blok mainnet Polkadot menggunakan playground
- menjalankan kueri GET sederhana untuk mendapatkan tinggi blok mainnet Polkadot menggunakan cURL

## Audiens yang dituju

Panduan ini ditujukan bagi para pengembang (developer) baru yang memiliki pengalaman pengembangan dan tertarik untuk mempelajari lebih lanjut tentang SubQuery.

## Panduan video

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Prasyarat

Anda akan memerlukan:

- akun GitHub

## 1. Buatlah proyek Anda

Mari membuat proyek bernama subql_hallowworld dan menjalankan instalasi wajib, codegen, dan bangun dengan package manager favorit Anda.

```shell
> subql init --starter subqlHelloWorld
yarn install
yarn codegen
yarn build
```

JANGAN jalankan perintah docker.

## 2. Buatlah repo GitHub

Pada GitHub, buatlah repositori publik baru. Berikan nama dan atur visibilitas Anda ke publik. Di sini, semuanya akan disimpan sebagai default untuk saat ini.

![buat repo github](/assets/img/github_create_new_repo.png)

Catat URL GitHub Anda, ini harus bersifat publik agar SubQuery dapat mengaksesnya.

![buat repo github](/assets/img/github_repo_url.png)

## 3. Push ke GitHub

Kembali ke direktori proyek Anda, inisialisasi ini sebagai direktori git. Jika tidak, Anda mungkin akan mendapatkan kesalahan "fatal: not a git repository (or any of the parent directories): .git"

```shell
git init
```

Kemudian tambahkan repositori jarak jauh dengan perintah:

```shell
git remote add origin https://github.com/seandotau/subqlHelloWorld.git
```

Ini pada dasarnya akan menetapkan repositori jarak jauh Anda ke "https://github.com/seandotau/subqlHelloWorld.git" dan memberinya nama "origin" yang merupakan nomenklatur standar untuk repositori jarak jauh pada GitHub.

Selanjutnya kita tambahkan kode ke repo kita dengan perintah berikut:

```shell
> git add .
> git commit -m "First commit"
[master (root-commit) a999d88] First commit
10 files changed, 3512 insertions(+)
create mode 100644 .gitignore
create mode 100644 README.md
create mode 100644 docker-compose.yml
create mode 100644 package.json
create mode 100644 project.yaml
create mode 100644 schema.graphql
create mode 100644 src/index.ts
create mode 100644 src/mappings/mappingHandlers.ts
create mode 100644 tsconfig.json
create mode 100644 yarn.lock
> git push origin master
Enumerating objects: 14, done.
Counting objects: 100% (14/14), done.
Delta compression using up to 12 threads
Compressing objects: 100% (13/13), done.
Writing objects: 100% (14/14), 59.35 KiB | 8.48 MiB/s, done.
Total 14 (delta 0), reused 0 (delta 0)
To https://github.com/seandotau/subqlHelloWorld.git
 * [new branch]      master -> master

```

Perintah push berarti "tolong push kode saya KE repo origin DARI repo lokal master saya". Refreshing GitHub harus menampilkan semua kode di GitHub.

![Commit pertama](/assets/img/first_commit.png)

Sekarang setelah Anda memasukkan kode ke GitHub, mari kita lihat bagaimana kita dapat meng-host-nya pada SubQuery Projects.

## 4. Buatlah proyek Anda

Navigasikan ke [https://project.subquery.network](https://project.subquery.network) dan masuk dengan akun GitHub Anda.

![Selamat datang di SubQuery Projects](/assets/img/welcome_to_subquery_projects.png)

Kemudian buatlah proyek baru,

![Selamat datang di SubQuery Projects](/assets/img/subquery_create_project.png)

Dan isi berbagai bidang dengan detail yang sesuai.

- **Akun GitHub:** Jika Anda memiliki lebih dari satu akun GitHub, pilihlah akun yang dipakai untuk membuat proyek ini. Proyek yang dibuat di akun organisasi GitHub akan dibagikan di antara anggota di dalam organisasi itu.
- **Nama Proyek:** Berikan nama proyek Anda di sini.
- **Subtitle:** Berikan subtitle untuk proyek Anda.
- **Deskripsi:** Jelaskan apa yang dilakukan proyek SubQuery Anda.
- **URL Repositori GitHub:** Ini harus berupa URL GitHub yang valid untuk repositori publik yang berisikan proyek SubQuery Anda. File schema.graphql harus berada di dalam root direktori Anda.
- **Sembunyikan proyek:** Apabila dipilih, ini akan menyembunyikan proyek Anda dari para penjelajah SubQuery publik. Biarkan ini tidak terpilih jika Anda ingin membagikan SubQuery Anda dengan komunitas!

![Buat parameter SubQuery](/assets/img/create_subquery_project_parameters.png)

Saat Anda mengklik buat atau create, Anda akan dibawa ke dasbor Anda.

![Dasbor SubQuery Projects](/assets/img/subquery_project_dashboard.png)

Dasbor ini berisikan banyak informasi berguna seperti jaringan yang digunakan, URL repositori GitHub dari source code yang dijalankan, kapan dibuat dan terakhir diperbarui, dan khususnya detail penerapan.

## 5. Deploy your project

Now that you have created your project within SubQuery Projects, setting up the display behaviour, the next step is to deploy your project making it operational. Deploying a version triggers a new SubQuery indexing operation to start, and sets up the required query service to start accepting GraphQL requests. You can also deploy new versions to existing projects here.

You can choose to deploy to various environments such as a production slot or a staging slot. Here we'll deploy to a production slot. Clicking on the "Deploy" button brings up a screen with the following fields:

![Terapkan ke slot produksi](/assets/img/deploy_production_slot.png)

- **Commit Hash Versi baru:** Dari GitHub pilih commit yang benar dari codebase proyek SubQuery yang ingin Anda terapkan
- **Indexer Version:** This is the version of SubQuery's node service that you want to run this SubQuery on. See [@subql/node](https://www.npmjs.com/package/@subql/node)
- **Query Version:** This is the version of SubQuery's query service that you want to run this SubQuery on. See [@subql/query](https://www.npmjs.com/package/@subql/query)

Because we only have one commit, there is only a single option in the drop down. We'll also work with the latest version of the indexer and query version so we will accept the defaults and then click "Deploy Update".

You’ll then see your deployment in “Processing” status. Here, your code is getting deployed onto the SubQuery's managed infrastructure. Basically a server is getting spun up on demand and being provisioned for you. This will take a few minutes so time to grab a coffee!

![Pemrosesan penerapan](/assets/img/deployment_processing.png)

Penyebaran sekarang sedang berjalan.

![Penerapan berjalan](/assets/img/deployment_running.png)

## 6. Testing your project

Untuk menguji proyek Anda, klik pada 3 elipsis dan pilihlah "lihat pada SubQuery Explorer".

![Lihat proyek Subquery](/assets/img/view_on_subquery.png)

Ini akan membawa Anda ke "Playground" yang sudah tidak asing lagi di mana Anda dapat mengeklik tombol putar dan melihat hasil kueri.

![Playground Subquery](/assets/img/subquery_playground.png)

## 7. Bonus step

For the astute amongst us, you will recall that in the learning objectives, the last point was to run a simple GET query. To do this, we will need to grab the "Query Endpoint" displayed in the deployment details.

![Endpoint query](/assets/img/query_endpoint.png)

You can then send a GET request to this endpoint either using your favourite client such as [Postman](https://www.postman.com/) or [Mockoon](https://mockoon.com/) or via cURL in your terminal. For simplicity, cURL will be shown below.

Perintah curl yang untuk dijalankan adalah:

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

memberikan hasil dari:

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

Keterbacaan tidak menjadi perhatian di sini karena Anda mungkin akan memiliki beberapa kode front-end untuk dipakai dan menguraikan respons JSON ini.

## Ringkasan

In this SubQuery hosted quick start we showed how quick and easy it was to take a Subql project and deploy it to [SubQuery Projects](https://project.subquery.network) where all the infrastructure is provided for your convenience. There is an inbuilt playground for running various queries as well as an API endpoint for your code to integrate with.

# Hello World (được lưu trữ trên SubQuery)

Mục đích của bài quick start này là hướng dẫn cách bạn có thể chạy dự án khởi động mặc định trong SubQuery Projects (dịch vụ được quản lý của chúng tôi) trong một vài bước đơn giản.

We will take the simple starter project (and everything we've learned thus far) but instead of running it locally within Docker, we'll take advantage of SubQuery's managed hosting infrastructure. In other words, we let SubQuery do all the heavy lifting, running and managing production infrastructure.

## Mục tiêu học tập

Khi kết thúc quá trình quick start này, bạn sẽ:

- hiểu các điều kiện tiên quyết cần thiết
- có thể host một dự án trong [Dự án SubQuery](https://project.subquery.network/)
- chạy một truy vấn đơn giản để lấy chiều cao khối của mạng chính Polkadot bằng cách sử dụng playground
- chạy một truy vấn GET đơn giản để lấy chiều cao khối của mạng chính Polkadot bằng cách sử dụng cURL

## Đối tượng mục tiêu

Hướng dẫn này hướng tới các nhà phát triển mới đã có một số kinh nghiệm phát triển và muốn tìm hiểu thêm về SubQuery.

## Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Điều kiện tiên quyết

Bạn sẽ cần:

- một tài khoản GitHub

## 1. Create your project

Hãy tạo một dự án có tên là subql_hellowworld và chạy cài đặt bắt buộc, codegen và xây dựng với trình quản lý gói yêu thích của bạn.

```shell
> subql init --starter subqlHelloWorld
yarn install
yarn codegen
yarn build
```

KHÔNG chạy các lệnh docker.

## 2. Create a GitHub repo

In GitHub, create a new public repository. Provide a name and set your visibility to public. Here, everything is kept as the default for now.

![create github repo](/assets/img/github_create_new_repo.png)

Hãy lưu ý URL GitHub của bạn, URL này phải được công khai để SubQuery có thể truy cập.

![create github repo](/assets/img/github_repo_url.png)

## 3. Push to GitHub

Back in your project directory, initialise it as a git directory. Otherwise, you might get the error "fatal: not a git repository (or any of the parent directories): .git"

```shell
git init
```

Sau đó, thêm một repository từ xa bằng lệnh:

```shell
git remote add origin https://github.com/seandotau/subqlHelloWorld.git
```

Về cơ bản, điều này đặt kho lưu trữ từ xa của bạn thành “https://github.com/seandotau/subqlHelloWorld.git” và đặt cho nó tên “origin” là danh pháp tiêu chuẩn cho repository từ xa trong GitHub.

Tiếp theo, chúng tôi thêm code vào repo của chúng tôi bằng các lệnh sau:

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

The push command means "please push my code TO the origin repo FROM my master local repo". Refreshing GitHub should show all the code in GitHub.

![First commit](/assets/img/first_commit.png)

Bây giờ bạn đã có code của mình vào GitHub, hãy xem cách chúng tôi có thể lưu trữ code đó trong Dự án SubQuery.

## 4. Create your project

Điều hướng đến [https://project.subquery.network](https://project.subquery.network) và đăng nhập bằng tài khoản GitHub của bạn.

![Chào mừng bạn đến với Dự án SubQuery](/assets/img/welcome_to_subquery_projects.png)

Sau đó, tạo một dự án mới,

![Chào mừng bạn đến với Dự án SubQuery](/assets/img/subquery_create_project.png)

Và điền vào các trường khác nhau với các chi tiết thích hợp.

- **GitHub account:** If you have more than one GitHub account, select what account this project will be created under. Projects created in an GitHub organisation account are shared between members in that organisation.
- **Tên dự án:** Đặt tên cho dự án của bạn ở đây.
- **Phụ đề:** Cung cấp phụ đề cho dự án của bạn.
- **Mô tả:** Giải thích những gì dự án SubQuery của bạn thực hiện.
- **GitHub Repository URL:** This must be a valid GitHub URL to a public repository that contains your SubQuery project. The schema.graphql file must be in the root of your directory.
- **Hide project:** If selected, this will hide the project from the public SubQuery explorer. Keep this unselected if you want to share your SubQuery with the community!

![Tạo thông số SubQuery](/assets/img/create_subquery_project_parameters.png)

Khi bạn nhấp vào tạo, bạn sẽ được đưa đến trang tổng quan của mình.

![Bảng điều khiển Dự án SubQuery](/assets/img/subquery_project_dashboard.png)

Trang tổng quan chứa nhiều thông tin hữu ích như mạng mà nó đang sử dụng, URL kho lưu trữ GitHub của mã nguồn đang chạy, thời điểm nó được tạo và cập nhật lần cuối và đặc biệt là chi tiết triển khai.

## 5. Deploy your project

Now that you have created your project within SubQuery Projects, setting up the display behaviour, the next step is to deploy your project making it operational. Deploying a version triggers a new SubQuery indexing operation to start, and sets up the required query service to start accepting GraphQL requests. You can also deploy new versions to existing projects here.

You can choose to deploy to various environments such as a production slot or a staging slot. Here we'll deploy to a production slot. Clicking on the "Deploy" button brings up a screen with the following fields:

![Triển khai đến production slot](/assets/img/deploy_production_slot.png)

- **Commit Hash of new Version:** Từ GitHub, chọn cam kết chính xác của cơ sở mã dự án SubQuery mà bạn muốn triển khai
- **Indexer Version:** This is the version of SubQuery's node service that you want to run this SubQuery on. See [@subql/node](https://www.npmjs.com/package/@subql/node)
- **Query Version:** This is the version of SubQuery's query service that you want to run this SubQuery on. See [@subql/query](https://www.npmjs.com/package/@subql/query)

Because we only have one commit, there is only a single option in the drop down. We'll also work with the latest version of the indexer and query version so we will accept the defaults and then click "Deploy Update".

You’ll then see your deployment in “Processing” status. Here, your code is getting deployed onto the SubQuery's managed infrastructure. Basically a server is getting spun up on demand and being provisioned for you. This will take a few minutes so time to grab a coffee!

![Triển khai đang thực hiện](/assets/img/deployment_processing.png)

Việc triển khai hiện đang chạy.

![Triển khai đang chạy](/assets/img/deployment_running.png)

## 6. Testing your project

Để kiểm tra dự án của bạn, hãy nhấp vào 3 dấu chấm lửng và chọn "View on SubQuery Explorer".

![Xem dự án truy vấn con](/assets/img/view_on_subquery.png)

Thao tác này sẽ đưa bạn đến "Playground" quen thuộc, nơi bạn có thể nhấp vào nút play và xem kết quả của truy vấn.

![Subquery playground](/assets/img/subquery_playground.png)

## 7. Bonus step

For the astute amongst us, you will recall that in the learning objectives, the last point was to run a simple GET query. To do this, we will need to grab the "Query Endpoint" displayed in the deployment details.

![Kết thúc truy vấn](/assets/img/query_endpoint.png)

You can then send a GET request to this endpoint either using your favourite client such as [Postman](https://www.postman.com/) or [Mockoon](https://mockoon.com/) or via cURL in your terminal. For simplicity, cURL will be shown below.

Lệnh curl để chạy là:

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

đưa ra kết quả của:

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

Khả năng đọc không phải là mối quan tâm ở đây vì bạn có thể sẽ có một số mã giao diện người dùng để sử dụng và phân tích cú pháp phản hồi JSON này.

## Tóm lược

In this SubQuery hosted quick start we showed how quick and easy it was to take a Subql project and deploy it to [SubQuery Projects](https://project.subquery.network) where all the infrastructure is provided for your convenience. There is an inbuilt playground for running various queries as well as an API endpoint for your code to integrate with.

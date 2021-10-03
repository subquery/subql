# Hello World (โฮสต์บน SubQuery)

จุดมุ่งหมายของ quick start นี้คือการแสดงวิธีการเริ่มใช้งานโปรเจ็กต์เริ่มต้นสำหรับทำงานใน SubQuery Projects (บริการของเรา) ด้วยไม่กี่ขั้นตอนง่ายๆ

เราจะใช้ starter project ที่เรียบง่ายนี้ (รวมถึงทุกอย่างที่เราได้เรียนรู้มาจนถึงตอนนี้) แต่แทนที่จะเรียกใช้ Docker เราจะใช้ประโยชน์จากโครงสร้างพื้นฐานของโฮสติ้งที่มีการจัดการโดย SubQuery กล่าวอีกนัยหนึ่ง เราให้ SubQuery จัดการโครงสร้างพื้นฐานของงาน production การรัน และจัดการงานหนักๆทั้งหมด

## วัตถุประสงค์การเรียนรู้

เมื่อจบจาก quick start นี้ คุณจะ:

- ทำความเข้าใจข้อกำหนดเบื้องต้นที่จำเป็น
- สามารถโฮสต์โปรเจ็กต์ใน [SubQuery Projects](https://project.subquery.network/) ได้
- รัน query อย่างง่ายเพื่อ get ค่า block height ของเครือข่าย Polkadot mainnet โดยใช้ Playground
- รัน GET query อย่างง่ายเพื่อขอค่า block height ของเครือข่าย Polkadot mainnet โดยใช้ cURL

## กลุ่มเป้าหมาย

คู่มือนี้จัดทำขึ้นสำหรับนักพัฒนาหน้าใหม่ที่มีประสบการณ์ด้านการพัฒนามาบ้างแล้วและสนใจที่จะเรียนรู้เพิ่มเติมเกี่ยวกับ SubQuery

## คู่มือวิดีโอ

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## ข้อกำหนดเบื้องต้น

คุณจะต้องมี:

- บัญชี GitHub

## 1. สร้างโปรเจ็กต์ของคุณ

เริ่มสร้างโปรเจ็กต์ชื่อ subql_hellowworld และรันการติดตั้ง codegen และทำการ build ด้วยตัวจัดการแพ็คเกจที่คุณชื่นชอบ

```shell
> subql init --starter subqlHelloWorld
yarn install
yarn codegen
yarn build
```

อย่ารันโดยใช้คำสั่ง docker

## 2. สร้าง GitHub repo

ที่ GitHub ให้สร้าง repository ใหม่ ระบุชื่อและตั้งค่าการเปิดเผยของบัญชีคุณเป็นสาธารณะ ทุกอย่างในนี้จะถูกเก็บไว้เป็นค่าเริ่มต้นสำหรับตอนนี้

![create github repo](/assets/img/github_create_new_repo.png)

จด GitHub URL ของคุณ ซึ่งต้องเป็นสาธารณะเพื่อให้ SubQuery เข้าถึงได้

![create github repo](/assets/img/github_repo_url.png)

## 3. Push ไปยัง GitHub

กลับไปที่ project directory ของคุณ ให้ตั้งค่าเป็น git directory มิฉะนั้น คุณอาจได้รับ error "fatal: not a git repository (or any of the parent directories): .git"

```shell
git init
```

จากนั้นเพิ่ม remote repository ด้วยคำสั่ง:

```shell
git remote add origin https://github.com/seandotau/subqlHelloWorld.git
```

โดยทั่วไปจะตั้งค่าที่ remote repository ของคุณเป็น "https://github.com/seandotau/subqlHelloWorld.git" และตั้งชื่อว่า "origin" ซึ่งเป็นมาตรฐานการตั้งชื่อ remote repository ใน GitHub

จากนั้น เราจะเพิ่มโค้ดใน repo ของเราด้วยคำสั่งต่อไปนี้:

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

คำสั่ง push หมายถึง "โปรด push โค้ดของฉันไปที่ origin repo จาก master local repo ของฉัน" การรีเฟรช GitHub ควรแสดงโค้ดทั้งหมดใน GitHub

![First commit](/assets/img/first_commit.png)

ในตอนน้ีคุณได้นำโค้ดของคุณเข้าไปอยู่ใน GitHub แล้ว มาดูวิธีที่เราจะสามารถโฮสต์โค้ดนั้นใน SubQuery Projects

## 4. สร้างโปรเจ็กต์ของคุณ

ไปที่ [https://project.subquery.network](https://project.subquery.network) และเข้าสู่ระบบด้วยบัญชี GitHub ของคุณ

![Welcome to SubQuery Projects](/assets/img/welcome_to_subquery_projects.png)

แล้วสร้างโปรเจ็กต์ใหม่

![Welcome to SubQuery Projects](/assets/img/subquery_create_project.png)

และกรอกข้อมูลในช่องต่างๆให้ครบถ้วน ด้วยรายละเอียดที่เหมาะสม

- **GitHub account:** หากคุณมีบัญชี GitHub มากกว่าหนึ่งบัญชี ให้เลือกบัญชีที่จะใช้สร้างโปรเจ็กต์นี้ โปรเจ็กต์ที่สร้างขึ้นในบัญชี GitHub organisation จะถูกแชร์ระหว่างสมาชิกใน organisation นั้นๆ
- **Project Name:** ใส่ ชื่อโปรเจ็กต์ของคุณที่นี่
- **Subtitle:** กรอกชื่อรองสำหรับชื่อโปรเจ็กต์ของคุณ
- **Description:** อธิบายว่าโครงการ SubQuery ของคุณทำอะไร
- **GitHub Repository URL:** ต้องเป็น GitHub URL ที่ใช้งานได้ซึ่งชี้ไปยัง repositoryสาธารณะที่มีโปรเจ็กต์ SubQuery ของคุณ ไฟล์ schema.graphql ต้องอยู่ในรูทไดเร็กทอรีของคุณ
- **Hide project:** หากเลือก จะเป็นการซ่อนโปรเจ็กต์จาก SubQuery explorer สาธารณะ อย่าเลือกตัวเลือกนี้หากคุณต้องการแชร์ SubQuery ของคุณกับชุมชน!

![Create SubQuery parameters](/assets/img/create_subquery_project_parameters.png)

เมื่อคุณคลิก create คุณจะถูกพาไปที่แดชบอร์ดของคุณ

![SubQuery Project dashboard](/assets/img/subquery_project_dashboard.png)

แดชบอร์ดประกอบด้วยข้อมูลที่เป็นประโยชน์มากมาย เช่น เครือข่ายที่ใช้, GitHub repository URL ของซอร์สโค้ดที่กำลังทำงาน, ข้อมูลเวลาที่ถูกสร้างขึ้นและอัปเดตล่าสุด และโดยเฉพาะอย่างยิ่งรายละเอียดการ deploy

## 5. Deploy โปรเจ็กต์ของคุณ

ในตอนนี้ คุณได้สร้างโปรเจ็กต์ของคุณภายใน SubQuery Projects และตั้งค่าลักษณะการแสดงผล ขั้นตอนต่อไปคือการ deploy โปรเจ็กต์ของคุณเพื่อให้สามารถทำงานได้ Deploying a version triggers a new SubQuery indexing operation to start, and sets up the required query service to start accepting GraphQL requests. You can also deploy new versions to existing projects here.

You can choose to deploy to various environments such as a production slot or a staging slot. Here we'll deploy to a production slot. Clicking on the "Deploy" button brings up a screen with the following fields:

![Deploy to production slot](/assets/img/deploy_production_slot.png)

- **Commit Hash of new Version:** From GitHub select the correct commit of the SubQuery project codebase that you want deployed
- **Indexer Version:** This is the version of SubQuery's node service that you want to run this SubQuery on. See [@subql/node](https://www.npmjs.com/package/@subql/node)
- **Query Version:** This is the version of SubQuery's query service that you want to run this SubQuery on. See [@subql/query](https://www.npmjs.com/package/@subql/query)

Because we only have one commit, there is only a single option in the drop down. We'll also work with the latest version of the indexer and query version so we will accept the defaults and then click "Deploy Update".

You’ll then see your deployment in “Processing” status. Here, your code is getting deployed onto the SubQuery's managed infrastructure. Basically a server is getting spun up on demand and being provisioned for you. This will take a few minutes so time to grab a coffee!

![Deployment processing](/assets/img/deployment_processing.png)

The deployment is now running.

![Deployment running](/assets/img/deployment_running.png)

## 6. Testing your project

To test your project, click on the 3 ellipsis and select "View on SubQuery Explorer".

![View Subquery project](/assets/img/view_on_subquery.png)

This will take you to the ever familiar "Playground" where you can click the play button and see the results of the query.

![Subquery playground](/assets/img/subquery_playground.png)

## 7. Bonus step

For the astute amongst us, you will recall that in the learning objectives, the last point was to run a simple GET query. To do this, we will need to grab the "Query Endpoint" displayed in the deployment details.

![Query endpoing](/assets/img/query_endpoint.png)

You can then send a GET request to this endpoint either using your favourite client such as [Postman](https://www.postman.com/) or [Mockoon](https://mockoon.com/) or via cURL in your terminal. For simplicity, cURL will be shown below.

The curl command to run is:

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

giving the results of:

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

Readability is not a concern here as you will probably have some front end code to consume and parse this JSON response.

## Summary

In this SubQuery hosted quick start we showed how quick and easy it was to take a Subql project and deploy it to [SubQuery Projects](https://project.subquery.network) where all the infrastructure is provided for your convenience. There is an inbuilt playground for running various queries as well as an API endpoint for your code to integrate with.

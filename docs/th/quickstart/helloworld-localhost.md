# Hello World (localhost + Docker)

ยินดีต้อนรับ quick start ของ SubQuery Hello World การ quick start มีจุดมุ่งหมายเพื่อแสดงให้คุณเห็นว่าจะใช้ starter project ที่ได้รับต้นเพื่อรันใน Docker ได้อย่างไรในไม่กี่ขั้นตอนง่ายๆ

## วัตถุประสงค์การเรียนรู้

เมื่อจบจาก quick start นี้ คุณจะ:

- ทำความเข้าใจข้อกำหนดเบื้องต้นที่จำเป็น
- เข้าใจคำสั่งทั่วไปพื้นฐาน
- สามารถไปยัง localhost:3000 และดู playground ได้
- รัน query อย่างง่ายเพื่อ get ค่า block height ของเครือข่าย Polkadot mainnet โดยใช้ Playground

## กลุ่มเป้าหมาย

คู่มือนี้จัดทำขึ้นสำหรับนักพัฒนาหน้าใหม่ที่มีประสบการณ์ด้านการพัฒนามาบ้างแล้วและสนใจที่จะเรียนรู้เพิ่มเติมเกี่ยวกับ SubQuery

## คู่มือวิดีโอ

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/j034cyUYb7k" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## ข้อกำหนดเบื้องต้น

คุณจะต้องมี:

- yarn หรือ npm package manager
- SubQuery CLI (`@subql/cli`)
- Docker

คุณสามารถรันคำสั่งต่อไปนี้ในเทอร์มินัลเพื่อดูว่าคุณมีข้อกำหนดเบื้องต้นเหล่านี้อยู่แล้วหรือไม่

```shell
yarn -v (or npm -v)
subql -v
docker -v
```

สำหรับผู้ใช้งานขั้นสูง ให้คัดลอกและวางสิ่งต่อไปนี้:

```shell
echo -e "My yarn version is:" `yarn -v` "\nMy subql version is:" `subql -v`  "\nMy docker version is:" `docker -v`
```

ซึ่งควรส่งคืนค่า: (สำหรับผู้ใช้ npm ให้แทนที่ yarn ด้วย npm)

```shell
My yarn version is: 1.22.10
My subql version is: @subql/cli/0.9.3 darwin-x64 node-v16.3.0
My docker version is: Docker version 20.10.5, build 55c4c88
```

หากคุณได้รับดังข้างต้น แสดงว่าคุณพร้อมแล้ว หากไม่เป็นเช่นนั้น ให้ทำตามลิงก์เหล่านี้เพื่อติดตั้ง:

- [yarn](https://classic.yarnpkg.com/en/docs/install/) หรือ [npm](https://www.npmjs.com/get-npm)
- [SubQuery CLI](quickstart.md#install-the-subquery-cli)
- [Docker](https://docs.docker.com/get-docker/)

## 1. เริ่มต้นโปรเจ็กต์

ขั้นตอนแรกในการเริ่มต้นกับ SubQuery คือการเรียกใช้คำสั่ง `subql init` โดยเริ่มต้นโปรเจ็กต์ด้วยชื่อ `subqlHelloWorld` โปรดทราบว่า มีเพียง author เท่านั้นที่จำเป็น อย่างอื่นที่เหลือว่างไว้ ดังแสดงด้านล่าง

```shell
> subql init --starter subqlHelloWorld
Git repository:
RPC endpoint [wss://polkadot.api.onfinality.io/public-ws]:
Authors: sa
Description:
Version: [1.0.0]:
License: [Apache-2.0]:
Init the starter package... subqlHelloWorld is ready

```

อย่าลืมไปที่ไดเร็กทอรีใหม่นี้

```shell
cd subqlHelloWorld
```

## 2. ติดตั้ง dependencies

ในตอนนี้ ให้ทำการติดตั้ง yarn หรือ node เพื่อติดตั้ง dependencies ต่างๆ

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn install ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm install ``` </CodeGroupItem> </CodeGroup>

ตัวอย่างของ `yarn install`

```shell
> yarn install
yarn install v1.22.10
info No lockfile found.
[1/4] 🔍  Resolving packages...
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
[4/4] 🔨  Building fresh packages...
success Saved lockfile.
✨  Done in 31.84s.
```

## 3. การ generate code

ให้รัน `yarn codegen` เพื่อสร้าง typescript จาก GraphQL schema

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn codegen ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script codegen ``` </CodeGroupItem> </CodeGroup>

ตัวอย่างของ `yarn codegen`

```shell
> yarn codegen
yarn run v1.22.10
$ ./node_modules/.bin/subql codegen
===============================
---------Subql Codegen---------
===============================
* Schema StarterEntity generated !
* Models index generated !
* Types index generated !
✨  Done in 1.02s.
```

**คำเตือน** เมื่อมีการเปลี่ยนแปลงไฟล์ schema โปรดอย่าลืมรัน `yarn codegen` อีกครั้งเพื่อสร้าง types directory ของคุณใหม่

## 4. การ build code

ขั้นตอนต่อไปคือการ build โค้ดด้วย `yarn build`

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

ตัวอย่างของ `yarn build`

```shell
> yarn build
yarn run v1.22.10
$ tsc -b
✨  Done in 5.68s.
```

## 5. รัน Docker

การใช้ Docker ช่วยให้คุณเรียกใช้ตัวอย่างนี้ได้อย่างรวดเร็ว เนื่องจากโครงสร้างพื้นฐานที่จำเป็นทั้งหมดมีการจัดเตรียมไว้ในอิมเมจ Docker แล้ว รัน `docker-compose pull && docker-compose up`

สิ่งนี้จะนำพาทุกอย่างให้ทำงาน ซึ่งในที่สุดคุณจะได้รับบล็อก

```shell
> #SNIPPET
subquery-node_1   | 2021-06-05T22:20:31.450Z <subql-node> INFO node started
subquery-node_1   | 2021-06-05T22:20:35.134Z <fetch> INFO fetch block [1, 100]
subqlhelloworld_graphql-engine_1 exited with code 0
subquery-node_1   | 2021-06-05T22:20:38.412Z <fetch> INFO fetch block [101, 200]
graphql-engine_1  | 2021-06-05T22:20:39.353Z <nestjs> INFO Starting Nest application...
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO AppModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO ConfigureModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.383Z <nestjs> INFO GraphqlModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.809Z <nestjs> INFO Nest application successfully started
subquery-node_1   | 2021-06-05T22:20:41.122Z <fetch> INFO fetch block [201, 300]
graphql-engine_1  | 2021-06-05T22:20:43.244Z <express> INFO request completed

```

## 6. การเรียกใช้ playground

ไปที่ http://localhost:3000/ และวาง query ที่ด้านซ้ายของหน้าจอ จากนั้นกดปุ่ม play

```
{
 query{
   starterEntities(last:10, orderBy:FIELD1_ASC ){
     nodes{
       field1
     }
   }
 }
}

```

SubQuery Playground บน localhost

![playground localhost](/assets/img/subql_playground.png)

ค่า block count ใน playground ควรตรงกับจำนวนบล็อก (ในทางเทคนิคแล้วคือ ค่า block height) ในเทอร์มินัลด้วย

## สรุป

ในการ quick start นี้ เราได้สาธิตขั้นตอนพื้นฐานในการทำให้ starter project ใช้งานได้ในสภาพแวดล้อม Docker จากนั้นไปที่ localhost:3000 และเรียกใช้ query เพื่อส่งคืนหมายเลขบล็อกของเครือข่าย mainnet Polkadot

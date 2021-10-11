# การรัน SubQuery ภายในเครื่อง

คู่มือนี้จะศึกษาวิธีการรันโหนด SubQuery บนโครงสร้างพื้นฐานของคุณ ซึ่งรวมถึง indexer และ query service คุณไม่อยากที่จะต้องคอยกังวลเกี่ยวกับการรันโครงสร้างพื้นฐาน SubQuery ของคุณเองใช่หรือไม่? SubQuery ให้บริการ [โฮสต์ที่มีการจัดการ](https://explorer.subquery.network) แก่ชุมชนฟรี [ทำตามคู่มือการเผยแพร่ของเรา](../publish/publish.md) เพื่อดูว่าคุณสามารถอัปโหลดโครงการของคุณไปยัง [SubQuery Projects](https://project.subquery.network)ได้อย่างไร

## การใช้กับ Docker

ทางเลือกหนึ่ง คือการรัน <strong>Docker Container</strong> ซึ่งกำหนดจากไฟล์ `docker-compose.yml` สำหรับโปรเจ็กต์ใหม่ที่เพิ่งเริ่มต้น คุณไม่จำเป็นต้องเปลี่ยนแปลงอะไรในส่วนนี้

ภายใต้ไดเร็กทอรีของโปรเจ็กต์ ให้รันคำสั่งต่อไปนี้:

```shell
docker-compose pull && docker-compose up
```

อาจต้องใช้เวลาสักครู่ในการดาวน์โหลดแพ็คเกจที่จำเป็น ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query) และ Postgres) สำหรับครั้งแรก แต่ในไม่ช้าคุณจะเห็นการทำงานของโหนด SubQuery

## การรัน Indexer (subql/node)

สิ่งที่ต้องมี:

- ฐานข้อมูล [Postgres](https://www.postgresql.org/) (เวอร์ชัน 12 ขึ้นไป) ในขณะที่ [โหนด SubQuery](#start-a-local-subquery-node) กำลังทำการ index บล็อกเชน ข้อมูลที่ออกมาจะถูกเก็บไว้ในอินสแตนซ์ของฐานข้อมูลภายนอก

โหนด SubQuery เป็นการทำงานที่ดึงข้อมูลบล็อกเชนที่ใช้ substrate ตามโปรเจ็กต์ SubQuery และบันทึกลงในฐานข้อมูล Postgres

### การติดตั้ง

```shell
# NPM
npm install -g @subql/node
```

โปรดทราบว่าเรา **ไม่** สนับสนุนให้ใช้ `yarn global` เนื่องจากการจัดการ dependency ที่ไม่ดี ซึ่งอาจนำไปสู่ข้อผิดพลาดได้

เมื่อติดตั้งแล้ว คุณสามารถเริ่มโหนดด้วยคำสั่งต่อไปนี้:

```shell
subql-node <command>
```

### คำสั่งที่สำคัญ

คำสั่งต่อไปนี้จะช่วยคุณในการตั้งค่าโหนด SubQuery ให้เสร็จสมบูรณ์และเริ่มการ index หากต้องการข้อมูลเพิ่มเติม คุณสามารถรันคำสั่ง `--help` ได้ตลอดเวลา

#### ชี้ไปที่ local path ของโปรเจ็กต์

```
subql-node -f your-project-path
```

#### การใช้ Dictionary

การใช้ full chain dictionary สามารถเร่งการประมวลผลโปรเจ็กต์ SubQuery ได้อย่างมาก ทั้งในระหว่างการทดสอบหรือระหว่างการ index ครั้งแรกของคุณ ในบางกรณี เราพบว่าประสิทธิภาพการ index เพิ่มขึ้นถึง 10 เท่า

chain dictionary แบบเต็มรูปแบบจะทำการ index ข้อมูลตำแหน่งเหตุการณ์และปัจจัยภายนอกทั้งหมดที่เกิดขึ้นภายในแต่ละเฉพาะ chain ไว้ล่วงหน้า ช่วยให้โหนดของคุณสามารถข้ามไปยังตำแหน่งที่เกี่ยวข้องเมื่อมีการ index แทนที่จะตรวจสอบทีละบล็อก

คุณสามารถเพิ่ม dictionary endpoint ในไฟล์ `project.yaml` ของคุณ (ดู [ไฟล์ Manifest](../create/manifest.md)) หรือสามารถระบุในขณะรันไทม์โดยใช้คำสั่งต่อไปนี้:

```
subql-node --network-dictionary=https://api.subquery.network/sq/subquery/dictionary-polkadot
```

[อ่านเพิ่มเติมเกี่ยวกับวิธีการทำงานของ SubQuery Dictionary](../tutorials_examples/dictionary.md)

#### การเชื่อมต่อกับฐานข้อมูล

```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
subql-node -f your-project-path 
````
ซึ่งจะขึ้นอยู่กับการกำหนดค่าฐานข้อมูล Postgres ของคุณด้วย (เช่น รหัสผ่านของฐานข้อมูลอื่น), โปรดตรวจสอบด้วยว่าทั้ง indexer (`subql/node`) และบริการสืบค้น (`subql/query`) สามารถสร้างการเชื่อมต่อกับฐานข้อมูลได้

#### Specify a configuration file

```
subql-node -c your-project-config.yml
```

This will point the query node to a configuration file which can be in YAML or JSON format. Check out the example below.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### Change the block fetching batch size

```
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

When the indexer first indexes the chain, fetching single blocks will significantly decrease the performance. Increasing the batch size to adjust the number of blocks fetched will decrease the overall processing time. The current default batch size is 100.

#### Run in local mode

```
subql-node -f your-project-path --local
```

For debugging purposes, users can run the node in local mode. Switching to local model will create Postgres tables in the default schema `public`.

If local mode is not used, a new Postgres schema with the initial `subquery_` and corresponding project tables will be created.


#### Check your node health

There are 2 endpoints that you can use to check and monitor the health of a running SubQuery node.

- Health check endpoint that returns a simple 200 response
- Metadata endpoint that includes additional analytics of your running SubQuery node

Append this to the base URL of your SubQuery node. Eg `http://localhost:3000/meta` will return:

```bash
{
    "currentProcessingHeight": 1000699,
    "currentProcessingTimestamp": 1631517883547,
    "targetHeight": 6807295,
    "bestHeight": 6807298,
    "indexerNodeVersion": "0.19.1",
    "lastProcessedHeight": 1000699,
    "lastProcessedTimestamp": 1631517883555,
    "uptime": 41.151789063,
    "polkadotSdkVersion": "5.4.1",
    "apiConnected": true,
    "injectedApiConnected": true,
    "usingDictionary": false,
    "chain": "Polkadot",
    "specName": "polkadot",
    "genesisHash": "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
    "blockTime": 6000
}
```

`http://localhost:3000/health` will return HTTP 200 if successful.

A 500 error will be returned if the indexer is not healthy. This can often be seen when the node is booting up.

```shell
{
    "status": 500,
    "error": "Indexer is not healthy"
}
```

If an incorrect URL is used, a 404 not found error will be returned.

```shell
{
"statusCode": 404,
"message": "Cannot GET /healthy",
"error": "Not Found"
}
```

#### Debug your project

Use the [node inspector](https://nodejs.org/en/docs/guides/debugging-getting-started/) to run the following command.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

For example:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```
Then open up the Chrome dev tools, go to Source > Filesystem and add your project to the workspace and start debugging. For more information, check out [How to debug a SubQuery project](https://doc.subquery.network/tutorials_examples/debug-projects/)
## Running a Query Service (subql/query)

### Installation

```shell
# NPM
npm install -g @subql/query
```

Please note that we **DO NOT** encourage the use of `yarn global` due to its poor dependency management which may lead to an errors down the line.

### Running the Query service
``` export DB_HOST=localhost subql-query --name <project_name> --playground ````

Make sure the project name is the same as the project name when you [initialize the project](../quickstart/quickstart.md#initialise-the-starter-subquery-project). Also, check the environment variables are correct.

After running the subql-query service successfully, open your browser and head to `http://localhost:3000`. You should see a GraphQL playground showing in the Explorer and the schema that is ready to query.

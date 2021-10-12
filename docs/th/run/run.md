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

#### ระบุไฟล์สำหรับกำหนดค่า

```
subql-node -c your-project-config.yml
```

สิ่งนี้จะชี้โหนดการสืบค้นไปยังไฟล์การกำหนดค่าซึ่งจะอยู่ในรูปแบบไฟล์ YAML หรือ JSON Check out the example below.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### การเปลี่ยน batch size ในการ fetch บล็อค

```
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

เมื่อ indexer ทำการ index chain ในครั้งแรก การ fetch ทีละบล็อกจะลดประสิทธิภาพการทำงานลงอย่างมาก การเพิ่ม batch size เพื่อปรับจำนวนบล็อคที่ fetch จะลดเวลาดำเนินการโดยรวมได้ batch size เริ่มต้นในปัจจุบันคือ 100

#### การรันในโหมด local

```
subql-node -f your-project-path --local
```

เพื่อจุดประสงค์ในการ debug ผู้ใช้สามารถเรียกใช้โหนดในโหมด local ได้ การเปลี่ยนไปใช้โหมด local จะสร้างตาราง Postgres ใน ` public ` ซึ่งเป็น default schema

หากไม่ได้ใช้โหมด local, Postgres schema ใหม่ที่มี `subquery_` เริ่มต้นและตารางโปรเจ็กต์ที่เกี่ยวข้องจะถูกสร้างขึ้น


#### ตรวจสอบสถานะความสมบูรณ์ของโหนดของคุณ

มีปลายทาง 2 endpoints ที่คุณสามารถใช้ตรวจสอบและมอนิเตอร์ความสมบูรณ์ของโหนด SubQuery ที่ทำงานอยู่

- Health check endpoint ที่ส่งคืนค่า response 200 อย่างง่าย
- Metadata endpoint ที่รวมการวิเคราะห์เพิ่มเติมเกี่ยวกับโหนด SubQuery ของคุณที่กำลังทำงานอยู่

เพิ่มสิ่งนี้ไปกับ URL พื้นฐานของโหนด SubQuery ของคุณ ตัวอย่างเช่น` http://localhost:3000/meta` จะส่งคืนค่า:

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

`http://localhost:3000/health` จะคืนค่า HTTP 200 ถ้าสำเร็จ

ค่า 500 error จะถูกส่งเมื่อ indexer ไม่สมบูรณ์ ซึ่งมักจะเห็นได้เมื่อโหนดกำลังทำการบูทอัพ

```shell
{
    "status": 500,
    "error": "Indexer is not healthy"
}
```

หากใช้ URL ที่ไม่ถูกต้อง ข้อผิดพลาด 404 not found จะถูกส่งกลับมา

```shell
{
"statusCode": 404,
"message": "Cannot GET /healthy",
"error": "Not Found"
}
```

#### การ debug โปรเจ็กต์ของคุณ

ใช้ [node inspector](https://nodejs.org/en/docs/guides/debugging-getting-started/) เพื่อเรียกใช้คำสั่งต่อไปนี้

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

ยกตัวอย่างเช่น:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```
จากนั้นเปิดเครื่องมือ Chrome dev ไปที่ Source > Filesystem และเพิ่มโปรเจ็กต์ของคุณลงในเวิร์กสเปซ แล้วเริ่มการ debug ดูรายละเอียดเพิ่มเติมได้ที่ [วิธี debug โปรเจ็กต์ SubQuery](https://doc.subquery.network/tutorials_examples/debug-projects/)
## การรัน Query Service (subql/query)

### การติดตั้ง

```shell
# NPM
npm install -g @subql/query
```

โปรดทราบว่าเรา **ไม่** สนับสนุนให้ใช้ `yarn global` เนื่องจากการจัดการ dependency ที่ไม่ดี ซึ่งอาจนำไปสู่ข้อผิดพลาดได้

### การรัน Query service
``` export DB_HOST=localhost subql-query --name <project_name> --playground ````

ตรวจสอบให้แน่ใจว่าชื่อโปรเจ็กต์นี้ตรงกับชื่อโปรเจ็กต์เมื่อคุณ [เริ่มต้นโปรเจ็กต์](../quickstart/quickstart.md#initialise-the-starter-subquery-project) ตรวจสอบ environment variables ด้วยว่าถูกต้องหรือไม่

หลังจากรัน service subql-query สำเร็จแล้ว ให้เปิดเบราว์เซอร์ของคุณ แล้วไปที่ `http://localhost:3000` คุณควรเห็น GraphQL playground แสดงใน Explorer และมี schema ที่พร้อมสำหรับการสืบค้น

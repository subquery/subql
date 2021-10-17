# Flags ต่างๆใน Command Line

## subql-node

### --help

คำสั่งนี้จะแสดงตัวเลือกความช่วยเหลือ

```shell
> subql-node --help
Options:
      --help                Show help                                  [boolean]
      --version             Show version number                        [boolean]
  -f, --subquery            Local path of the subquery project          [string]
      --subquery-name       Name of the subquery project                [string]
  -c, --config              Specify configuration file                  [string]
      --local               Use local mode                             [boolean]
      --batch-size          Batch size of blocks to fetch in one round  [number]
      --timeout             Timeout for indexer sandbox to execute the mapping
                            functions                                   [number]
      --debug               Show debug information to console output. will
                            forcefully set log level to debug
                                                      [boolean] [default: false]
      --profiler            Show profiler information to console output
                                                      [boolean] [default: false]
      --network-endpoint    Blockchain network endpoint to connect      [string]
      --output-fmt          Print log as json or plain text
                                           [string] [choices: "json", "colored"]
      --log-level           Specify log level to print. Ignored when --debug is
                            used
          [string] [choices: "fatal", "error", "warn", "info", "debug", "trace",
                                                                       "silent"]
      --migrate             Migrate db schema (for management tables only)
                                                      [boolean] [default: false]
      --timestamp-field     Enable/disable created_at and updated_at in schema
                                                       [boolean] [default: true]
  -d, --network-dictionary  Specify the dictionary api for this network [string]
      --proof-of-index      Enable/disable proof of index
                                                      [boolean] [default: false]
```

### --version

คำสั่งนี้จำแสดงเวอร์ชันปัจจุบัน

```shell
> subql-node --version
0.19.1
```

### -f, --subquery

ใช้ flag นี้เพื่อเริ่มการทำงานโปรเจ็กต์ SubQuery

```shell
subql-node -f . // หรือ
subql-node --subquery .
```

### --subquery-name

flag นี้อนุญาตให้คุณระบุชื่อสำหรับโปรเจ็กต์ของคุณ ซึ่งทำหน้าที่เสมือนว่าได้ทำการสร้างอินสแตนซ์ของโปรเจ็กต์ของคุณ เมื่อมีการระบุชื่อใหม่ schema ของฐานข้อมูลใหม่จะถูกสร้างขึ้น และบล็อกการซิงโครไนซ์จะเริ่มต้นจากศูนย์

```shell
subql-node -f . --subquery-name=test2
```

### -c, --config

การกำหนดค่าต่างๆทั้งหมดเหล่านี้สามารถทำได้ในไฟล์ .yml หรือ .json แล้วอ้างอิงด้วย config flag

ตัวอย่างไฟล์ subquery_config.yml

```shell
subquery: . // จำเป็นต้องมี นี่คือ local path ของโปรเจ็กต์ ซึ่งหมายถึงไดเร็กทอรีภายในเครื่องปัจจุบัน
subqueryName: hello // ชื่อเสริม (Optional)
batchSize: 55 // การกำหนดค่าเสริม (Optional)
```

วางไฟล์นี้ในไดเร็กทอรีเดียวกันกับโปรเจ็กต์ จากนั้น ในไดเร็กทอรีโปรเจ็กต์ปัจจุบัน ให้รัน:

```shell
> subql-node -c ./subquery_config.yml
```

### --local

flag นี้ใช้เพื่อจุดประสงค์ในการ debug เป็นหลัก โดยจะสร้างตาราง starter_entity เริ่มต้นใน schema "postgres" ที่เป็นค่าเริ่มต้น

```shell
subql-node -f . --local
```

โปรดทราบว่าเมื่อคุณใช้ flag นี้ การลบ flag นี้ไม่ได้หมายความว่า flag นี้จะชี้ไปที่ฐานข้อมูลอื่น หากต้องการชี้ไปยังฐานข้อมูลอื่น คุณจะต้องสร้างฐานข้อมูลใหม่และเปลี่ยนการตั้งค่า env เป็นฐานข้อมูลใหม่ กล่าวอีกนัยหนึ่ง "export DB_DATABASE=<new_db_here>"

### --batch-size

flag นี้อนุญาตให้คุณตั้งค่าขนาด batch size ผ่าน command line หากมีการตั้งค่า batch size ในไฟล์ config ด้วยเช่นกัน การดำเนินการนี้จะมีความสำคัญเหนือกว่า

```shell
> subql-node -f . --batch-size=20
2021-08-09T23:24:43.775Z <fetch> INFO fetch block [6601,6620], total 20 blocks
2021-08-09T23:24:45.606Z <fetch> INFO fetch block [6621,6640], total 20 blocks
2021-08-09T23:24:47.415Z <fetch> INFO fetch block [6641,6660], total 20 blocks
2021-08-09T23:24:49.235Z <fetch> INFO fetch block [6661,6680], total 20 blocks
```

<!-- ### --timeout -->

### --debug

ข้อมูลนี้จะส่งออกข้อมูลการ debug ไปยังเอาต์พุตคอนโซลและบังคับตั้งค่าระดับ log เป็น debug

```shell
> subql-node -f --debug
2021-08-10T11:45:39.471Z <db> DEBUG Executing (1b0d0c23-d7c7-4adb-a703-e4e5c414e035): INSERT INTO "subquery_1"."starter_entities" ("id","block_height","created_at","updated_at") VALUES ($1,$2,$3,$4) ON CONFLICT ("id") DO UPDATE SET "id"=EXCLUDED."id","block_height"=EXCLUDED."block_height","updated_at"=EXCLUDED."updated_at" RETURNING "id","block_height","created_at","updated_at";
2021-08-10T11:45:39.472Z <db> DEBUG Executing (default): UPDATE "subqueries" SET "next_block_height"=$1,"updated_at"=$2 WHERE "id" = $3
2021-08-10T11:45:39.472Z <db> DEBUG Executing (1b0d0c23-d7c7-4adb-a703-e4e5c414e035): COMMIT;
```

### --profiler

ข้อมูลนี้แสดงข้อมูลตัวสร้างโปรไฟล์

```shell
subql-node -f . --local --profiler
2021-08-10T10:57:07.234Z <profiler> INFO FetchService, fetchMeta, 3876 ms
2021-08-10T10:57:08.095Z <profiler> INFO FetchService, fetchMeta, 774 ms
2021-08-10T10:57:10.361Z <profiler> INFO SubstrateUtil, fetchBlocksBatches, 2265 ms
2021-08-10T10:57:10.361Z <fetch> INFO fetch block [3801,3900], total 100 blocks
```

### --network-endpoint

flag นี้อนุญาตให้ผู้ใช้แทนที่การกำหนดค่า endpoint ของเครือข่ายจากไฟล์ manifest

```shell
subql-node -f . --network-endpoint="wss://polkadot.api.onfinality.io/public-ws"
```

โปรดทราบว่าจะต้องตั้งค่านี้ในไฟล์ manifest ด้วย ไม่เช่นนั้น คุณจะได้รับ:

```shell
ERROR Create Subquery project from given path failed! Error: failed to parse project.yaml.
An instance of ProjectManifestImpl has failed the validation:
 - property network has failed the following constraints: isObject
 - property network.network has failed the following constraints: nestedValidation
```

### --output-fmt

มีรูปแบบเอาต์พุตของเทอร์มินัลสองแบบที่แตกต่างกัน JSON หรือ colored โดย colored จะเป็นค่าเริ่มต้นและมีข้อความแบบสี

```shell
> subql-node -f . --output-fmt=json
{"level":"info","timestamp":"2021-08-10T11:58:18.087Z","pid":24714,"hostname":"P.local","category":"fetch","message":"fetch block [10501,10600], total 100 blocks"}
```

```shell
> subql-node -f . --output-fmt=colored
2021-08-10T11:57:41.480Z <subql-node> INFO node started
(node:24707) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
2021-08-10T11:57:48.981Z <fetch> INFO fetch block [10201,10300], total 100 blocks
2021-08-10T11:57:51.862Z <fetch> INFO fetch block [10301,10400], total 100 blocks
```

### --log-level

จะมี 7 ตัวเลือกให้เลือก “fatal”, “error”, “warn”, “info”, “debug”, “trace”, “silent” ตัวอย่างด้านล่างแสดงผลของตัวเลือก silent จะไม่มีการพิมพ์สิ่งใดในเทอร์มินัล ดังนั้นวิธีเดียวที่จะบอกได้ว่าโหนดทำงานหรือไม่คือการสืบค้นฐานข้อมูลสำหรับนับจำนวนแถว (select count(\*) from subquery_1.starter_entities) หรือสืบค้น block height

```shell
> subql-node -f . --log-level=silent
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
(Use `node --trace-warnings ...` to show where the warning was created)
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
(node:24686) [DEP0152] DeprecationWarning: Custom PerformanceEntry accessors are deprecated. Please use the detail property.
(node:24686) [PINODEP007] Warning: bindings.level is deprecated, use options.level option instead
```

<!-- ### --migrate TBA -->

### --timestamp-field

ค่าเริ่มต้นสิ่งนี้ คือ true โดยสามารถตั้งค่าเป็น false ด้วย:

```shell
> subql-node -f . –timestamp-field=false
```

สิ่งนี้จะลบคอลัมน์ created_at และ updated_at ในตาราง starter_entities

### -d, --network-dictionary

สิ่งนี้ทำให้คุณสามารถระบุ dictionary endpoint ซึ่งเป็นบริการฟรีที่มีให้และโฮสต์ที่: [https://explorer.subquery.network/](https://explorer.subquery.network/) (ค้นหา dictionary) และ API endpoint ของ: https://api.subquery.network/sq/subquery/dictionary-polkadot

โดยปกติจะมีการตั้งค่านี้ในไฟล์ manifest ของคุณ แต่ด้านล่างจะแสดงตัวอย่างการใช้แบบเป็น argument ใน command line

```shell
subql-node -f . -d "https://api.subquery.network/sq/subquery/dictionary-polkadot"
```

[อ่านเพิ่มเติมเกี่ยวกับวิธีการทำงานของ SubQuery Dictionary](../tutorials_examples/dictionary.md)

## subql-query

### --help

ซึ่งจะแสดงตัวเลือกความช่วยเหลือ

```shell
ns:
      --help        Show help                                          [boolean]
      --version     Show version number                                [boolean]
  -n, --name        project name                             [string] [required]
      --playground  enable graphql playground                          [boolean]
      --output-fmt  Print log as json or plain text
                      [string] [choices: "json", "colored"] [default: "colored"]
      --log-level   Specify log level to print.
          [string] [choices: "fatal", "error", "warn", "info", "debug", "trace",
                                                     "silent"] [default: "info"]
      --indexer     Url that allow query to access indexer metadata     [string]
```

### --version

นี่จะแสดงเวอร์ชันปัจจุบัน

```shell
> subql-query --version
0.7.0
```

### -n, --name

flag นี้ใช้เพื่อเริ่มบริการ query service หากไม่มีการตั้งค่าสถานะ --subquery-name เมื่อทำการรัน indexer ชื่อที่นี่จะอ้างอิงถึงชื่อโปรเจ็กต์เริ่มต้น หากมีการตั้งค่า --subquery-name ชื่อที่นี่ควรตรงกับที่ตั้งไว้

```shell
> subql-node -f . // --subquery-name not set

> subql-query -n subql-helloworld  --playground // the name defaults to the project directory name
```

```shell
> subql-node -f . --subquery-name=hiworld // --subquery-name set

> subql-query -n hiworld --playground  // the name points to the subql-helloworld project but with the name of hiworld
```

### --playground

flag นี้เปิดใช้งาน graphql playground ดังนั้นควรใส่ไว้ตามค่าเริ่มต้นเสมอเพื่อการใช้งานใดๆ

### --output-fmt

อ่าน [--output-fmt](https://doc.subquery.network/references/references.html#output-fmt)

### --log-level

อ่าน [--log-level](https://doc.subquery.network/references/references.html#log-level)

<!-- ### --indexer TBA -->

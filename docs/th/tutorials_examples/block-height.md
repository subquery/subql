# จะเริ่มต้นที่ block height ที่ต่างกันได้อย่างไร?

## คู่มือวิดีโอ

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## บทนำ

โดยค่าเริ่มต้น โปรเจ็กต์เริ่มต้นทั้งหมดจะเริ่มซิงโครไนซ์บล็อกเชนจาก genesis block กล่าวอีกนัยหนึ่งจากบล็อก 1 สำหรับบล็อคเชนขนาดใหญ่ โดยปกติจะใช้เวลาหลายวันหรือหลายสัปดาห์ในการซิงโครไนซ์อย่างสมบูรณ์

ในการเริ่มโหนด SubQuery ที่ซิงโครไนซ์จาก block height ที่ไม่ใช่ศูนย์ สิ่งที่คุณต้องทำคือแก้ไขไฟล์ project.yaml ของคุณและเปลี่ยน key startBlock

ด้านล่างเป็นไฟล์ project.yaml ที่ตั้งค่าบล็อกเริ่มต้นเป็น 1,000,000

```shell
specVersion: 0.0.1
description: ""
repository: ""
schema: ./schema.graphql
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1000000
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
 
Text
XPath: /pre/code
```

## ทำไมไม่เริ่มจากศูนย์?

สาเหตุหลักคือสามารถลดเวลาในการซิงโครไนซ์บล็อกเชนได้ ซึ่งหมายความว่าหากคุณสนใจเฉพาะธุรกรรมในช่วง 3 เดือนที่ผ่านมา คุณสามารถซิงโครไนซ์เฉพาะช่วง 3 เดือนที่ผ่านมาเท่านั้น ทำให้เวลารอน้อยลง และคุณสามารถเริ่มการพัฒนาได้เร็วขึ้น

## ข้อเสียของการไม่เริ่มจากศูนย์คืออะไร?

ข้อเสียเปรียบที่ชัดเจนที่สุดคือคุณจะไม่สามารถสืบค้นข้อมูลบนบล็อคเชนสำหรับบล็อกที่คุณไม่มีได้

## จะทราบความ blockchain height ปัจจุบันได้อย่างไร?

หากคุณกำลังใช้เครือข่าย Polkadot คุณสามารถไปที่ [https://polkascan.io/](https://polkascan.io/) เลือกเครือข่ายแล้วดูค่า "Finalized Block"

## ฉันต้องทำการ rebuild หรือ codegen หรือไม่?

ไม่ เนื่องจากคุณกำลังแก้ไขไฟล์ project.yaml ซึ่งโดยพื้นฐานแล้วเป็น configuration file คุณจะไม่ต้องทำการ rebuild หรือ regenerate โค้ด typescript ใหม่

# อธิบาย Hello World

ใน [คู่มือเริ่มต้นฉบับย่อของ Hello World](helloworld-localhost.md) เราได้ใช้คำสั่งง่ายๆ และได้รับตัวอย่างแบบเร็วๆ วิธีนี้ช่วยให้คุณมั่นใจได้ว่าคุณมีข้อกำหนดเบื้องต้นทั้งหมดแล้ว และสามารถใช้ Playground ภายในเครื่องสำหรับ query อย่างง่าย เพื่อรับข้อมูลแรกของคุณจาก SubQuery ในที่นี้ เราจะพิจารณาให้ละเอียดยิ่งขึ้นว่าคำสั่งเหล่านั้นหมายถึงอะไร

## subql init

คำสั่งแรกที่เราเรียกใช้คือ `subql init --starter subqlHelloWorld`

สิ่งนี้ช่วยจัดการส่วนงานที่หนัก และสร้างไฟล์ทั้งหมดให้คุณ ตามที่ระบุไว้ใน [เอกสารอย่างเป็นทางการ](quickstart.md#configure-and-build-the-starter-project) คุณจะต้องทำงานกับไฟล์ต่อไปนี้เป็นหลัก:

- Manifest ใน `project.yaml`
- GraphQL Schema ใน `schema.graphql`
- Mapping functions ในไดเรกทอรี `src/mappings/`

![key subql files](/assets/img/main_subql_files.png)

ไฟล์เหล่านี้เป็นส่วนหลักของทุกสิ่งที่เราทำ ดังนั้น เราจะจัดสรรเวลาให้กับไฟล์เหล่านี้มากขึ้นในบทความอื่นๆ ในตอนนี้ ให้รู้ว่า schema ประกอบด้วยคำอธิบายของข้อมูลที่ผู้ใช้สามารถ request ได้จาก SubQuery API, ไฟล์ yaml ของโครงการซึ่งมีพารามิเตอร์ประเภท "configuration" และแน่นอนว่ามี mappingHandlers ที่มี typescript ซึ่งมีฟังก์ชันสำหรับแปลงข้อมูล

## yarn install

The next thing we did was `yarn install`. `npm install` can be used as well.

> A short history lesson. Node Package Manager or npm was initially released in 2010 and is a tremendously popular package manager among JavaScript developers. It is the default package that is automatically installed whenever you install Node.js on your system. Yarn was initially released by Facebook in 2016 with the intention to address some of the performance and security shortcomings of working with npm (at that time).

What yarn does is look at the `package.json` file and download various other dependencies. Looking at the `package.json` file, it doesn't look like there are many dependencies, but when you run the command, you'll notice that 18,983 files are added. This is because each dependency will also have its own dependencies.

![key subql files](/assets/img/dependencies.png)

## yarn codegen

Then we ran `yarn codegen` or `npm run-script codegen`. What this does is fetch the GraphQL schema (in the `schema.graphql`) and generates the associated typescript model files (Hence the output files will have a .ts extension). You should never change any of these generated files, only change the source `schema.graphql` file.

![key subql files](/assets/img/typescript.png)

## yarn build

`yarn build` or `npm run-script build` was then executed. This should be familiar for seasoned programmers. It creates a distribution folder performing things such as code optimisation preparing for a deployment.

![key subql files](/assets/img/distribution_folder.png)

## docker-compose

The final step was the combined docker command `docker-compose pull && docker-compose up` (can be run separately as well). The `pull` command grabs all the required images from Docker Hub and the `up` command starts the container.

```shell
> docker-compose pull
Pulling postgres        ... done
Pulling subquery-node   ... done
Pulling graphql-engine  ... done
```

When the container is started, you'll see the terminal spit out lots of text showing the status of the node and the GraphQL engine. It's when you see:

```
subquery-node_1   | 2021-06-06T02:04:25.490Z <fetch> INFO fetch block [1, 100]
```

that you know that the SubQuery node has started to synchronise.

## Summary

Now that you've had an insight into what is happening under the covers, the question is where to from here? If you are feeling confident, you can jump into learning about how to [create a project](../create/introduction.md) and learn more about the three key files. The manifest file, the GraphQL schema, and the mappings file.

Otherwise, continue to our tutorials section where we look at how we can run this Hello World example on SubQuery's hosted infrastructure, we'll look at modifying the start block, and we'll take a deeper dive at running SubQuery projects by running readily available and open source projects.

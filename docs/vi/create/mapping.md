# Lập bản đồ

Các hàm ánh xạ xác định cách dữ liệu chuỗi được chuyển đổi thành các thực thể GraphQL được tối ưu hóa mà chúng tôi đã xác định trước đó trong tệp `schema.graphql`.

Các ánh xạ được viết trong một tập hợp con của TypeScript được gọi là AssemblyScript có thể được biên dịch thành WASM (WebAssembly).

- Các ánh xạ được định nghĩa trong thư mục `src / mappings` và được xuất dưới dạng một hàm
- Các ánh xạ này cũng được xuất dưới dạng `src / index.ts`
- Các tệp ánh xạ là tham chiếu trong `project.yaml` dưới trình xử lý ánh xạ.

Có ba lớp hàm ánh xạ; [Trình xử lý khối](#block-handler), [Trình xử lý sự kiện](#event-handler) và [ Trình xử lý cuộc gọi](#call-handler).

## Trình xử lý khối

Bạn có thể sử dụng trình xử lý khối để nắm bắt thông tin mỗi khi khối mới được gắn vào chuỗi Chất nền, ví dụ: chặn số. Để đạt được điều này, một BlockHandler đã xác định sẽ được gọi một lần cho mỗi khối.

```ts
import {SubstrateBlock} from '@subql/types';

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  // Create a new StarterEntity with the block hash as it's ID
  const record = new starterEntity(block.block.header.hash.toString());
  record.field1 = block.block.header.number.toNumber();
  await record.save();
}
```

[SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) là kiểu giao diện mở rộng của [signBlock](https://polkadot.js.org/docs/api/cookbook/blocks/), nhưng cũng bao gồm `specVersion` và `timestamp`.

## Xử lý sự kiện

Bạn có thể sử dụng trình xử lý sự kiện để nắm bắt thông tin khi các sự kiện nhất định được đưa vào một khối mới. Các sự kiện là một phần của thời gian chạy Substrate mặc định và một khối có thể chứa nhiều sự kiện.

Trong quá trình xử lý, trình xử lý sự kiện sẽ nhận một sự kiện cơ chất như một đối số với các đầu vào và đầu ra đã nhập của sự kiện. Bất kỳ loại sự kiện nào cũng sẽ kích hoạt ánh xạ, cho phép ghi lại hoạt động với nguồn dữ liệu. Bạn nên sử dụng [Bộ lọc ánh xạ](./manifest.md#mapping-filters) trong tệp kê khai của mình để lọc các sự kiện nhằm giảm thời gian lập chỉ mục dữ liệu và cải thiện hiệu suất ánh xạ.

```ts
import {SubstrateEvent} from "@subql/types";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, balance]}} = event;
    // Retrieve the record by its ID
    const record = new starterEntity(event.extrinsic.block.block.header.hash.toString());
    record.field2 = account.toString();
    record.field3 = (balance as Balance).toBigInt();
    await record.save();
```

[SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) là kiểu giao diện mở rộng của [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Bên cạnh dữ liệu sự kiện, nó cũng bao gồm một `id` (khối chứa sự kiện này) và phần bên ngoài bên trong của khối này.

## Trình xử lý cuộc gọi

Trình xử lý cuộc gọi được sử dụng khi bạn muốn nắm bắt thông tin về một số ngoại vi chất nền nhất định.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
  const record = new starterEntity(extrinsic.block.block.header.hash.toString());
  record.field4 = extrinsic.block.timestamp;
  await record.save();
}
```

[SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) mở rộng [GenericExtriuality](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). Nó được gán một `id` (khối mà khối bên ngoài này thuộc về) và cung cấp một thuộc tính bên ngoài để mở rộng các sự kiện giữa khối này. Ngoài ra, nó ghi lại trạng thái thành công của ngoại cảnh này.

## Các trạng thái truy vấn

Mục tiêu của chúng tôi là cung cấp tất cả các nguồn dữ liệu cho người dùng để xử lý ánh xạ (không chỉ là ba loại sự kiện giao diện ở trên). Do đó, chúng tôi đã đưa ra một số giao diện @ polkadot / api để tăng khả năng.

Đây là những giao diện chúng tôi hiện đang hỗ trợ:

- [api.query. &lt;module&gt;. &lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) sẽ truy vấn khối <strong> hiện tại</strong>.
- [api.query. &lt;module&gt;. &lt;method&gt;.multi ()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) sẽ thực hiện nhiều truy vấn loại <strong>giống nhau</strong> tại khối hiện tại.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) sẽ thực hiện nhiều truy vấn thuộc loại <strong>different</strong> tại khối hiện tại.

Đây là những giao diện mà chúng tôi **KHÔNG** hỗ trợ hiện tại:

- ~~api.tx.\*~~
- ~~api.derive.\*~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.at~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.hash~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.range~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.sizeAt~~

Xem ví dụ về cách sử dụng API này trong trường hợp sử dụng mẫu [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold) của chúng tôi.

## Cuộc gọi RPC

Chúng tôi cũng hỗ trợ một số phương thức API RPC là các lệnh gọi từ xa cho phép hàm ánh xạ tương tác với node, truy vấn và trình thực tế. Tiền đề cốt lõi của SubQuery là nó có tính xác định và do đó, để giữ kết quả nhất quán, chúng tôi chỉ cho phép các lệnh gọi RPC lịch sử.

Các tài liệu trong [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) cung cấp một số phương thức sử dụng `BlockHash` làm tham số đầu vào (ví dụ: `at?:BlockHash`), hiện được cho phép. Chúng tôi cũng đã sửa đổi các phương pháp này để lấy băm khối lập chỉ mục hiện tại theo mặc định.

```typescript
// Let's say we are currently indexing a block with this hash number
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d064871148e9d41ef086f6a`;

// Original method has an optional input is block hash
const b1 = await api.rpc.chain.getBlock(blockhash);

// It will use the current block has by default like so
const b2 = await api.rpc.chain.getBlock();
```

- Đối với [Chuỗi chất nền tùy chỉnh](#custom-substrate-chains) lệnh gọi RPC, hãy xem [usage](#usage).

## Mô-đun và Thư viện

Để cải thiện khả năng xử lý dữ liệu của SubQuery, chúng tôi đã cho phép một số mô-đun tích hợp của NodeJS chạy các chức năng ánh xạ trong [sandbox](#the-sandbox) và cho phép người dùng gọi các thư viện của bên thứ ba.

Xin lưu ý rằng đây là một **tính năng thử nghiệm** và bạn có thể gặp phải lỗi hoặc sự cố có thể ảnh hưởng tiêu cực đến chức năng ánh xạ của bạn. Vui lòng báo cáo bất kỳ lỗi nào bạn tìm thấy bằng cách tạo sự cố trong [GitHub](https://github.com/subquery/subql).

### Mô-đun tích hợp

Hiện tại, chúng tôi cho phép các mô-đun NodeJS sau: `assert`, `buffer`, `crypto`, `util` và `path`.

Thay vì nhập toàn bộ mô-đun, chúng tôi khuyên bạn chỉ nên nhập (các) phương pháp bắt buộc mà bạn cần. Một số phương thức trong các mô-đun này có thể có các phụ thuộc không được hỗ trợ và sẽ không thành công khi nhập.

```ts
import {hashMessage} from 'ethers/lib/utils'; //Good way
import {utils} from 'ethers'; //Bad way

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
  const record = new starterEntity(extrinsic.block.block.header.hash.toString());
  record.field1 = hashMessage('Hello');
  await record.save();
}
```

### Thư viện bên thứ ba

Do các hạn chế của máy ảo trong hộp cát của chúng tôi, hiện tại, chúng tôi chỉ hỗ trợ các thư viện của bên thứ ba được viết bởi **CommonJS**.

Chúng tôi cũng hỗ trợ thư viện **hybrid** như `@polkadot/*` sử dụng ESM làm mặc định. Tuy nhiên, nếu bất kỳ thư viện nào khác phụ thuộc vào bất kỳ mô-đun nào ở định dạng **ESM**, máy ảo sẽ **KHÔNG** biên dịch và trả về lỗi.

## Custom Substrate Chains

SubQuery có thể được sử dụng trên bất kỳ chuỗi nào dựa trên Substrate, không chỉ Polkadot hoặc Kusama.

Bạn có thể sử dụng chuỗi dựa trên Chất nền tùy chỉnh và chúng tôi cung cấp các công cụ để tự động nhập các loại, giao diện và các phương pháp bổ sung bằng cách sử dụng [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

Trong các phần sau, chúng tôi sử dụng [ví dụ về kitty](https://github.com/subquery/subql-examples/tree/main/kitty) để giải thích quá trình tích hợp.

### Sự chuẩn bị

Tạo một thư mục mới `api-interface` trong thư mục `src` của dự án để lưu trữ tất cả các tệp được yêu cầu và được tạo. Chúng tôi cũng tạo một thư mục `api-interface/kitties` khi chúng tôi muốn thêm trang trí trong API từ mô-đun `kitties`.

#### Metadata

Chúng tôi cần siêu dữ liệu để tạo các điểm cuối API thực tế. Trong ví dụ về kitty, chúng tôi sử dụng một điểm cuối từ một mạng thử nghiệm cục bộ và nó cung cấp các loại bổ sung. Làm theo các bước trong [thiết lập siêu dữ liệu PolkadotJS](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) để truy xuất siêu dữ liệu của nút từ điểm cuối ** HTTP ** của nó.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```

hoặc từ điểm cuối ** websocket ** của nó với sự trợ giúp từ [`websocat`](https://github.com/vi/websocat):

```shell
//Install the websocat
brew install websocat

//Get metadata
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Tiếp theo, sao chép và dán đầu ra vào tệp JSON. Trong [ví dụ về kitty](https://github.com/subquery/subql-examples/tree/main/kitty), chúng tôi đã tạo `api-interface/kitty.json`.

#### Loại định nghĩa

Chúng tôi giả định rằng người dùng biết các loại cụ thể và hỗ trợ RPC từ chuỗi và nó được định nghĩa trong [Manifest](./manifest.md).

Sau khi thiết lập [types setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), chúng tôi tạo:

- `src/api-interface/define.ts` - điều này xuất tất cả các định folder definitions

```ts
export {default as kitties} from './kitties/definitions';
```

- `src/api-interface/kitties/Definition.ts` - định nghĩa cho mô-đun kitties

```ts
export default {
  // custom types
  types: {
    Address: 'AccountId',
    LookupSource: 'AccountId',
    KittyIndex: 'u32',
    Kitty: '[u8; 16]',
  },
  // custom rpc : api.rpc.kitties.getKittyPrice
  rpc: {
    getKittyPrice: {
      description: 'Get Kitty price',
      params: [
        {
          name: 'at',
          type: 'BlockHash',
          isHistoric: true,
          isOptional: false,
        },
        {
          name: 'kittyIndex',
          type: 'KittyIndex',
          isOptional: false,
        },
      ],
      type: 'Balance',
    },
  },
};
```

#### Các gói

- Trong tệp `package.json`, hãy đảm bảo thêm `@polkadot/typegen` làm phụ thuộc phát triển và `@polkadot/api` làm phụ thuộc thông thường ( lý tưởng là cùng một phiên bản). Chúng tôi cũng cần `ts-node` như một phụ thuộc phát triển để giúp chúng tôi chạy các tập lệnh.
- Chúng tôi thêm các tập lệnh để chạy cả hai loại; `generate:defs` và siêu dữ liệu `generate:meta` (theo thứ tự đó, vì vậy siêu dữ liệu có thể sử dụng các loại).

Đây là phiên bản đơn giản của `package.json`. Đảm bảo trong phần **scripts**, tên gói là chính xác và các thư mục hợp lệ.

```json
{
  "name": "kitty-birthinfo",
  "scripts": {
    "generate:defs": "ts-node --skip-project node_modules/.bin/polkadot-types-from-defs --package kitty-birthinfo/api-interfaces --input ./src/api-interfaces",
    "generate:meta": "ts-node --skip-project node_modules/.bin/polkadot-types-from-chain --package kitty-birthinfo/api-interfaces --endpoint ./src/api-interfaces/kitty.json --output ./src/api-interfaces --strict"
  },
  "dependencies": {
    "@polkadot/api": "^4.9.2"
  },
  "devDependencies": {
    "typescript": "^4.1.3",
    "@polkadot/typegen": "^4.9.2",
    "ts-node": "^8.6.2"
  }
}
```

### Gõ generation

Bây giờ việc chuẩn bị đã hoàn tất, chúng tôi đã sẵn sàng tạo các loại và metadata. Chạy các lệnh dưới đây:

```shell
# Yarn to install new dependencies
yarn

# Generate types
yarn generate:defs
```

Trong mỗi thư mục mô-đun (ví dụ: `/kitties`), bây giờ sẽ có `styles.ts` được tạo để xác định tất cả các giao diện từ định nghĩa của mô-đun này, cũng là một chỉ mục tệp `index.ts` xuất tất cả chúng.

```shell
# Generate metadata
yarn generate:meta
```

Lệnh này sẽ tạo metadata và một api-augment mới cho các API. Vì chúng tôi không muốn sử dụng API tích hợp sẵn, chúng tôi sẽ cần thay thế chúng bằng cách thêm ghi đè rõ ràng trong `tsconfig.json` của chúng tôi. Sau khi cập nhật, các đường dẫn trong cấu hình sẽ trông như thế này (không có chú thích):

```json
{
  "compilerOptions": {
    // this is the package name we use (in the interface imports, --package for generators) */
    "kitty-birthinfo/*": ["src/*"],
    // here we replace the @polkadot/api augmentation with our own, generated from chain
    "@polkadot/api/augment": ["src/interfaces/augment-api.ts"],
    // replace the augmented types with our own, as generated from definitions
    "@polkadot/types/augment": ["src/interfaces/augment-types.ts"]
  }
}
```

### Sử dụng

Bây giờ trong chức năng ánh xạ, chúng tôi có thể hiển thị cách siêu dữ liệu và các loại thực sự trang trí API. Điểm cuối RPC sẽ hỗ trợ các mô-đun và phương thức mà chúng tôi đã khai báo ở trên. Và để sử dụng lệnh gọi rpc tùy chỉnh, vui lòng xem phần[Custom chain rpc calls](#custom-chain-rpc-calls)

```typescript
export async function kittyApiHandler(): Promise<void> {
  //return the KittyIndex type
  const nextKittyId = await api.query.kitties.nextKittyId();
  // return the Kitty type, input parameters types are AccountId and KittyIndex
  const allKitties = await api.query.kitties.kitties('xxxxxxxxx', 123);
  logger.info(`Next kitty id ${nextKittyId}`);
  //Custom rpc, set undefined to blockhash
  const kittyPrice = await api.rpc.kitties.getKittyPrice(undefined, nextKittyId);
}
```

**Nếu bạn muốn xuất bản dự án này cho người khám phá của chúng tôi, vui lòng đưa các tệp đã tạo vào `src/api-interface`.**

### Lệnh gọi rpc chuỗi tùy chỉnh

Để hỗ trợ các lệnh gọi RPC chuỗi tùy chỉnh, chúng tôi phải đưa các định nghĩa RPC cho `typesBundle` theo cách thủ công, cho phép cấu hình theo từng thông số kỹ thuật. Bạn có thể xác định `stylesBundle` trong `project.yml`. Và hãy nhớ chỉ hỗ trợ loại cuộc gọi `isHistoric`.

```yaml
...
  types: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]",
  }
  typesBundle: {
    spec: {
      chainname: {
        rpc: {
          kitties: {
            getKittyPrice:{
                description: string,
                params: [
                  {
                    name: 'at',
                    type: 'BlockHash',
                    isHistoric: true,
                    isOptional: false
                  },
                  {
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isOptional: false
                  }
                ],
                type: "Balance",
            }
          }
        }
      }
    }
  }

```

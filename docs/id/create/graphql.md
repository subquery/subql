# Pelajari lebih lanjut tentang GraphQL

## Menentukan Entitas

The `schema.graphql` file defines the various GraphQL schemas. Due to the way that the GraphQL query language works, the schema file essentially dictates the shape of your data from SubQuery. To learn more about how to write in GraphQL schema language, we recommend checking out [Schemas and Types](https://graphql.org/learn/schema/#type-language).

**Penting: Saat Anda membuat perubahan apa pun ke file skema, mohon memastikan bahwa Anda meregenerasi direktori jenis Anda dengan perintah berikut `yarn codegen`**

### Entitas
Each entity must define its required fields `id` with the type of `ID!`. It is used as the primary key and unique among all entities of the same type.

Non-nullable fields in the entity are indicated by `!`. Please see the example below:

```graphql
type Example @entity {
  id: ID! # id field is always required and must look like this
  name: String! # This is a required field
  address: String # This is an optional field
}
```

### Skalar dan jenis yang didukung

Kami saat ini mendukung jenis skalar:
- `ID`
- `Int`
- `String`
- `BigInt`
- `Date`
- `Boolean`
- `<EntityName>` for nested relationship entities, you might use the defined entity's name as one of the fields. Please see in [Entity Relationships](#entity-relationships).
- `JSON` secara alternatif bisa menyimpan data yang terstruktur, mohon lihat [jenis JSON](#json-type)

## Mengindeks berdasarkan bidang kunci non primer

Untuk meningkatkan performa kueri, indeks bidang entitas dengan mengimplementasikan anotasi `@index` di bidang kunci non primer.

However, we don't allow users to add `@index` annotation on any [JSON](#json-type) object. By default, indexes are automatically added to foreign keys and for JSON fields in the database, but only to enhance query service performance.

Berikut sebuah contoh.

```graphql
type User @entity {
  id: ID!
  name: String! @index(unique: true) # unique can be set to true or false
  title: Title! # Indexes are automatically added to foreign key field 
}

type Title @entity {
  id: ID!  
  name: String! @index(unique:true)
}
```
Assuming we knew this user's name, but we don't know the exact id value, rather than extract all users and then filtering by name we can add `@index` behind the name field. This makes querying much faster and we can additionally pass the `unique: true` to  ensure uniqueness.

**Jika sebuah bidang tidak unik, ukuran hasil maksimalnya adalah 100**

Saat pembuatan kode berjalan, ini akan secara otomatis membuat `getByName` di bawah model `User`, dan bidang kunci asing `title` akan membuat metode `getByTitleId`, yang keduanya bisa diakses langsung di fungsi pemetaan.

```sql
/* Persiapkan catatan untuk entitas judul */
INSERT INTO titles (id, name) VALUES ('id_1', 'Captain')
```

```typescript
// Handler in mapping function
import {User} from "../types/models/User"
import {Title} from "../types/models/Title"

const jack = await User.getByName('Jack Sparrow');

const captainTitle = await Title.getByName('Captain');

const pirateLords = await User.getByTitleId(captainTitle.id); // List of all Captains
```

## Hubungan Entitas

An entity often has nested relationships with other entities. Setting the field value to another entity name will define a one-to-one relationship between these two entities by default.

Hubungan entitas berbeda (satu per satu, satu ke banyak, dan banyak ke banyak) bisa dikonfigurasikan menggunakan contoh di bawah ini.

### Hubungan Satu Per Satu

Hubungan satu per satu adalah hubungan default saat hanya satu entitas yang dipetakan.

Contoh: Sebuah paspor hanya milik satu orang saja dan satu orang hanya memiliki satu paspor (dalam contoh ini):

```graphql
type Person @entity {
  id: ID!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

or

```graphql
type Person @entity {
  id: ID!
  passport: Passport!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

### Hubungan Satu ke Banyak

Anda bisa menggunakan tanda kurung siku untuk mengindikasikan bahwa sebuah jenis bidang menyertakan beberapa entitas.

Contoh: Seseorang bisa memiliki beberapa akun.

```graphql
type Person @entity {
  id: ID!
  accounts: [Account] 
}

type Account @entity {
  id: ID!
  publicAddress: String!
}
```

### Hubungan Banyak ke Banyak
Hubungan banyak ke banyak bisa diraih dengan mengimplementasikan entitas pemetaan untuk menghubungkan dua entitas lainnya.

Contoh: Setiap orang merupakan bagian dari beberapa kelompok (PersonGroup) dan kelompok memiliki beberapa orang berbeda (PersonGroup).

```graphql
type Person @entity {
  id: ID!
  name: String!
  groups: [PersonGroup]
}

type PersonGroup @entity {
  id: ID!
  person: Person!
  Group: Group!
}

type Group @entity {
  id: ID!
  name: String!
  persons: [PersonGroup]
}
```

Memungkinkan juga halnya untuk membuat koneksi entitas yang sama di beberapa bidang entitas tengah.

Contohnya, sebuah akun bisa memiliki beberapa transfer, dan masing-masing transfer memiliki sumber dan akun tujuan.

Ini akan mendasarkan hubungan dua arah antara dua Akun (dari dan ke) melalui tabel Transfer.

```graphql
type Account @entity {
  id: ID!
  publicAddress: String!
}

type Transfer @entity {
  id: ID!
  amount: BigInt
  from: Account!
  to: Account!
}
```

### Pencarian Terbalik

Untuk menyalakan pencarian terbalik di sebuah entitas ke hubungan, lampirkan `@derivedFrom` ke bidang dan tunjuk ke bidang pencarian terbaliknya di entitas lain.

Ini menciptakan bidang virtual pada entitas yang bisa dikuerikan.

Transfer "dari" sebuah Akun bisa diakses dari entitas Akun dengan mengatur transferTerkirim atau transferDiterima dari bidang dari atau ke.

```graphql
type Account @entity {
  id: ID!
  publicAddress: String!
  sentTransfers: [Transfer] @derivedFrom(field: "from")
  receivedTransfers: [Transfer] @derivedFrom(field: "to")
}

type Transfer @entity {
  id: ID!
  amount: BigInt
  from: Account!
  to: Account!
}
```

## Jenis JSON

We are supporting saving data as a JSON type, which is a fast way to store structured data. We'll automatically generate corresponding JSON interfaces for querying this data and save you time defining and managing entities.

Kami menyarankan pengguna menggunakan jenis JSON di skenario berikut:
- Saat menyimpan data terstruktur di satu bidang lebih bisa diatur daripada membuat beberapa entitas berbeda.
- Menyimpan kunci yang berubah-ubah/preferensi nilai pengguna (di mana nilai bisa menjadi boolean, tekstual, atau numerik, dan Anda tidak ingin memiliki kolom terpisah untuk jenis data berbeda)
- Skema ini tidak stabil dan sering berubah

### Menentukan direktif JSON
Define the property as a JSON type by adding the `jsonField` annotation in the entity. This will automatically generate interfaces for all JSON objects in your project under `types/interfaces.ts`, and you can access them in your mapping function.

Unlike the entity, the jsonField directive object does not require any `id` field. A JSON object is also able to nest with other JSON objects.

````graphql
type AddressDetail @jsonField {
  street: String!
  district: String!
}

type ContactCard @jsonField {
  phone: String!
  address: AddressDetail # Nested JSON
}

type User @entity {
  id: ID! 
  contact: [ContactCard] # Store a list of JSON objects
}
````

### Mengkueri bidang JSON

Kekurangan menggunakan jenis JSON adalah dampak sekilas pada efisiensi kueri saat memfilter, karena setiap kali melakukan pencarian teks, begitu pula di seluruh entitas.

However, the impact is still acceptable in our query service. Here is an example of how to use the `contains` operator in the GraphQL query on a JSON field to find the first 5 users who own a phone number that contains '0064'.

```graphql
#To find the the first 5 users own phone numbers contains '0064'.

query{
  user(
    first: 5,
    filter: {
      contactCard: {
        contains: [{ phone: "0064" }]
    }
}){
    nodes{
      id
      contactCard
    }
  }
}
```

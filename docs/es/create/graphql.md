# Learn more about GraphQL

## Definiendo entidades

El archivo `schema.graphql` define los diversos esquemas GraphQL. Debido a la forma en que funciona el lenguaje de consulta GraphQL, el archivo de esquema esencialmente dicta la forma de sus datos de SubQuery. There are libraries to help you implement GraphQL in [many different languages](https://graphql.org/code/)

**Importante: Cuando haga cambios en el archivo de esquema, por favor, asegúrate de regenerar el directorio de tus tipos con el siguiente comando `yarn codegen`**

### Entidades
Cada entidad debe definir sus campos requeridos `id` con el tipo de `ID!`. Se utiliza como la clave primaria y única entre todas las entidades del mismo tipo.

Los campos no nulables en la entidad están indicados por `!`. Por favor vea el ejemplo a continuación:

```graphql
type Example @entity {
  id: ID! # id field is always required and must look like this
  name: String! # This is a required field
  address: String # This is an optional field
}
```

### Escalares y tipos soportados

Actualmente soportamos tipos de escalares fluidos:
- `ID`
- `Int`
- `String`
- `BigInt`
- `Date`
- `Boolean`
- `<EntityName>` para entidades de relación anidadas, puede utilizar el nombre de la entidad definida como uno de los campos. Consulte [Relaciones con Entidad](#entity-relationships).
- `JSON` puede almacenar datos estructurados alternativamente, consulte [tipo JSON](#json-type)

## Indexando por campo de clave no primaria

Para mejorar el rendimiento de la consulta, indexar un campo de entidad simplemente implementando la anotación `@index` en un campo de clave no primaria.

Sin embargo, no permitimos que los usuarios añadan anotación `@index` en cualquier objeto [JSON](#json-type). Por defecto, los índices se añaden automáticamente a las claves foráneas y para los campos JSON en la base de datos, pero sólo para mejorar el rendimiento del servicio de consultas.

Here is an example.

```graphql
type User @entity {
  id:
  name: String! ID!
  name: String! @index(unique: true) # unique can be set to true or false
  title: Title! # Indexes are automatically added to foreign key field 
}

type Title @entity {
  id:  
  name: String! ID!  
  name: String! @index(unique:true)
}
```
Asumiendo que conocíamos el nombre de este usuario, pero no conocemos el valor exacto del id, en lugar de extraer todos los usuarios y luego filtrar por nombre podemos añadir `@index` detrás del campo nombre. Esto hace que la consulta sea mucho más rápida y además podemos pasar el `único: verdadero` para asegurar la unidad.

**Si un campo no es único, el tamaño máximo del conjunto de resultados es 100**

When code generation is run, this will automatically create a `getByName` under the `User` model, and the foreign key field `title` will create a `getByTitleId` method, which both can directly be accessed in the mapping function.

```sql
/* Prepara un registro para la entidad de título */
INSERT INTO títulos (id, nombre) VALUES ('id_1', 'capitán')
```

```typescript
// Manejar en función de mapeo
import {User} from "../types/models/User"
import {Title} from "../types/models/Title"

const jack = await User.getByName('Jack Sparrow');

const captainTitle = await Title.getByName('Captain');

const pirateLords = await User.getByTitleId(captainTitle.id); // Lista de todos los Captaines
```

## Relaciones de Entidades

Una entidad a menudo tiene relaciones anidadas con otras entidades. Establecer el valor del campo a otro nombre de entidad definirá una relación uno a uno entre estas dos entidades por defecto.

Diferentes relaciones de entidad (uno a uno, uno a muchos, y muchos-a-muchos) pueden configurarse usando los ejemplos siguientes.

### Relaciones de uno a uno

Las relaciones de uno a uno son el valor por defecto cuando sólo una entidad es asignada a otra.

Ejemplo: Un pasaporte sólo pertenecerá a una persona y una persona sólo tiene un pasaporte (en este ejemplo):

```graphql
type Person @entity {
  id:
ID!
}

type Passport @entity {
  id:
  ID!
  owner:
}
```

o

```graphql
type Person @entity {
  id:
  passport: Passport!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

### Relación Uno-A-Muchos

Puede usar corchetes cuadrados para indicar que un tipo de campo incluye múltiples entidades.

Ejemplo: Una persona puede tener múltiples cuentas.

```graphql
type Person @entity {
  id:
  ID!
  passport: Passport!
}

type Passport @entity {
  id:
  ID!
  owner:
}
```

### Relación Muchos-A-Muchos
Una relación muchos-a-muchos puede lograrse implementando una entidad de mapeo para conectar las otras dos entidades.

Ejemplo: Cada persona es parte de múltiples grupos (PersonGrup) y los grupos tienen múltiples personas diferentes (PersonGrup).

```graphql
type Person @entity {
  id:
  name: String!
  [PersonGroup]
}

type PersonGroup @entity {
  id: ID!
  person: Person!
  person: Person!
  Group: Group!
Group: Group!
}

type Group @entity {
  id:
  ID!
  name: String!
  groups:
  ID!
  name: String!
  persons: [PersonGroup]
}
```

Also, it is possible to create a connection of the same entity in multiple fields of the middle entity.

For example, an account can have multiple transfers, and each transfer has a source and destination account.

This will establish a bi-directional relationship between two Accounts (from and to) through Transfer table.

```graphql
type Account @entity {
  id:
  ID!
  publicAddress: String!
}

type Transfer @entity {
  id:
ID!
  amount:
  BigInt
  from:
  Account!
  to:
}
```

### Reverse Lookups

To enable a reverse lookup on an entity to a relation, attach `@derivedFrom` to the field and point to its reverse lookup field of another entity.

This creates a virtual field on the entity that can be queried.

The Transfer "from" an Account is accessible from the Account entity by setting the sentTransfer or receivedTransfer as having their value derived from the respective from or to fields.

```graphql
type Account @entity {
  id:
  ID!
  publicAddress: String!
}
  [Transfer] @derivedFrom(field: "from")
  receivedTransfers: [Transfer] @derivedFrom(field: "to")
}

type Transfer @entity {
  id:
  amount: BigInt
  from: Account!
  Account!
  to:
}
```

## JSON type

We are supporting saving data as a JSON type, which is a fast way to store structured data. We'll automatically generate corresponding JSON interfaces for querying this data and save you time defining and managing entities.

We recommend users use the JSON type in the following scenarios:
- When storing structured data in a single field is more manageable than creating multiple separate entities.
- Saving arbitrary key/value user preferences (where the value can be boolean, textual, or numeric, and you don't want to have separate columns for different data types)
- The schema is volatile and changes frequently

### Define JSON directive
Define the property as a JSON type by adding the `jsonField` annotation in the entity. This will automatically generate interfaces for all JSON objects in your project under `types/interfaces.ts`, and you can access them in your mapping function.

Unlike the entity, the jsonField directive object does not require any `id` field. A JSON object is also able to nest with other JSON objects.

````graphql
type AddressDetail @jsonField {
  street:
  String!
  district:
String!
}

type ContactCard @jsonField {
  phone: String!
  address:
  AddressDetail # Nested JSON
}

type User @entity {
  id: 
  ID! 
  contact: [ContactCard] # Store a list of JSON objects
}
````

### Querying JSON fields

The drawback of using JSON types is a slight impact on query efficiency when filtering, as each time it performs a text search, it is on the entire entity.

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

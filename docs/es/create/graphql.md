# Esquema GraphQL

## Definición de entidades

El archivo `schema.graphql` define los diversos esquemas GraphQL. Debido a la forma en que funciona el lenguaje de consulta de GraphQL, el archivo de esquema esencialmente dicta la forma de sus datos de SubQuery. Para obtener más información sobre cómo escribir en el lenguaje de esquema GraphQL, recomendamos revisar [Esquemas y tipos](https://graphql.org/learn/schema/#type-language).

**Importante: Cuando haga cambios en el archivo de esquema, por favor, asegúrate de regenerar el directorio de tus tipos con el siguiente comando `yarn codegen`**

### Entidades
Cada entidad debe definir sus campos requeridos `id` con el tipo de `ID!`. Se utiliza como la clave primaria y única entre todas las entidades del mismo tipo.

Los campos que no aceptan valores Null en la entidad se indican mediante `!`. Por favor vea el ejemplo a continuación:

```graphql
type Example @entity {
  id: ID! # campo id siempre es obligatorio y debe verse como este
  name: String! # Este es un campo obligatorio
  address: String # Este es un campo opcional
}
```

### Escalares y tipos soportados

Actualmente soportamos tipos de escalares fluidos:
- `ID`
- `Int`
- `String`
- `BigInt`
- `Float`
- `Date`
- `Boolean`
- `<EntityName>` para entidades de relación anidadas, puede utilizar el nombre de la entidad definida como uno de los campos. Consulte [Relaciones con Entidades](#entity-relationships).
- `JSON` puede almacenar datos estructurados alternativamente, consulte [tipo JSON](#json-type)
- `<EnumName>` tipos son un tipo especial de escalar enumerado que está restringido a un conjunto particular de valores permitidos. Por favor vea [Graphql Enum](https://graphql.org/learn/schema/#enumeration-types)

## Indexando por un campo de clave no primaria

Para mejorar el rendimiento de la consulta, indexar un campo de entidad simplemente implementando la anotación `@index` en un campo de clave no primaria.

Sin embargo, no permitimos que los usuarios añadan anotación `@index` en cualquier objeto [JSON](#json-type). Por defecto, los índices se añaden automáticamente a las claves foráneas y para los campos JSON en la base de datos, pero sólo para mejorar el rendimiento del servicio de consultas.

Aquí tenemos un ejemplo.

```graphql
type User @entity {
  id: ID!
  name: String! @index(unique: true) # unique puede establecerse en verdadero o falso
 title: Title! # Los índices se añaden automáticamente al campo de clave foránea 
}

type Title @entity {
  id: ID!  
  name: String! @index(unique:true)
}
```
Asumiendo que conocíamos el nombre de este usuario, pero no conocemos el valor exacto del id, en lugar de extraer todos los usuarios y luego filtrar por nombre podemos añadir `@index` detrás del campo nombre. Esto hace que la consulta sea mucho más rápida y además podemos pasar el `único: verdadero` para asegurar la unidad.

**Si un campo no es único, el tamaño máximo del conjunto de resultados es 100**

Cuando se ejecuta la generación de código, esto creará automáticamente un `getByName` bajo el modelo `User`, y el campo de clave foránea `title` creará un método `getByTitleId`, a la que se puede acceder directamente ambos en la función de mapeo.

```sql
/* Prepare a record for title entity */
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

## Entity Relationships

An entity often has nested relationships with other entities. Setting the field value to another entity name will define a one-to-one relationship between these two entities by default.

Different entity relationships (one-to-one, one-to-many, and many-to-many) can be configured using the examples below.

### One-to-One Relationships

One-to-one relationships are the default when only a single entity is mapped to another.

Example: A passport will only belong to one person and a person only has one passport (in this example):

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

### One-to-Many relationships

You can use square brackets to indicate that a field type includes multiple entities.

Example: A person can have multiple accounts.

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

### Many-to-Many relationships
A many-to-many relationship can be achieved by implementing a mapping entity to connect the other two entities.

Example: Each person is a part of multiple groups (PersonGroup) and groups have multiple different people (PersonGroup).

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

Also, it is possible to create a connection of the same entity in multiple fields of the middle entity.

For example, an account can have multiple transfers, and each transfer has a source and destination account.

This will establish a bi-directional relationship between two Accounts (from and to) through Transfer table.

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

### Reverse Lookups

To enable a reverse lookup on an entity to a relation, attach `@derivedFrom` to the field and point to its reverse lookup field of another entity.

This creates a virtual field on the entity that can be queried.

The Transfer "from" an Account is accessible from the Account entity by setting the sentTransfer or receivedTransfer as having their value derived from the respective from or to fields.

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

### Querying JSON fields

The drawback of using JSON types is a slight impact on query efficiency when filtering, as each time it performs a text search, it is on the entire entity.

However, the impact is still acceptable in our query service. Here is an example of how to use the `contains` operator in the GraphQL query on a JSON field to find the first 5 users who own a phone number that contains '0064'.

```graphql
#Para encontrar los primeros 5 usuarios de los números de teléfono contienen '0064'.

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

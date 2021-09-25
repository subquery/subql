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

Aquí tienes un ejemplo:

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

Además, es posible crear una conexión de la misma entidad en múltiples campos de la entidad media.

Por ejemplo, una cuenta puede tener múltiples transferencias, y cada transferencia tiene una cuenta de origen y destino.

Esto establecerá una relación bidireccional entre dos Cuentas (de y a) a través de la tabla Transferencia.

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

### Búsqueda inversa

Para habilitar una búsqueda inversa en una entidad a una relación, adjunta `@derivedFrom` al campo y apunta a su campo de búsqueda inversa de otra entidad.

Esto crea un campo virtual en la entidad que se puede consultar.

La transferencia "de" una Cuenta es accesible desde la entidad de la Cuenta estableciendo la transferencia de sentencias o la transferencia recibida teniendo su valor derivado del respectivo de o a los campos.

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

## Tipo JSON

Estamos soportando guardar datos como un tipo JSON, que es una forma rápida de almacenar datos estructurados. Generaremos automáticamente interfaces JSON correspondientes para consultar estos datos y ahorraremos tiempo definiendo y gestionando entidades.

Recomendamos que los usuarios usen el tipo JSON en los siguientes escenarios:
- Al almacenar datos estructurados en un solo campo es más manejable que la creación de múltiples entidades separadas.
- Guardando las preferencias de usuario clave/valor arbitrario (donde el valor puede ser booleano, textual, o numérico, y no quiere tener columnas separadas para diferentes tipos de datos)
- El esquema es volátil y cambia con frecuencia

### Definir la directiva JSON
Define la propiedad como un tipo JSON agregando la anotación `jsonField` en la entidad. Esto automáticamente generará interfaces para todos los objetos JSON en su proyecto bajo `types/interfaces.ts`, y puedes acceder a ellos desde tu función de mapeo.

A diferencia de la entidad, el objeto de directiva jsonField no requiere ningún campo `id`. Un objeto JSON también es capaz de anidar con otros objetos JSON.

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

### Consultando campos JSON

El inconveniente del uso de tipos JSON es un ligero impacto en la eficiencia de la consulta al filtrar, como cada vez que realiza una búsqueda de texto, se encuentra en toda la entidad.

Sin embargo, el impacto sigue siendo aceptable en nuestro servicio de consultas. Aquí hay un ejemplo de cómo utilizar el operador `contains` en la consulta GraphQL en un campo JSON para encontrar los 5 primeros usuarios que poseen un número de teléfono que contiene '0064'.

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

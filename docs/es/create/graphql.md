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
/* Prepara un registro para la entidad de título */
INSERT INTO titles (id, name) VALUES ('id_1', 'capitán')
```

```typescript
// Handler in mapping function
import {User} from "../types/models/User"
import {Title} from "../types/models/Title"

const jack = await User.getByName('Jack Sparrow');

const captainTitle = await Title.getByName('Captain');

const pirateLords = await User.getByTitleId(captainTitle.id); // List of all Captains
```

## Relaciones de Entidades

Una entidad a menudo tiene relaciones anidadas con otras entidades. Establecer el valor del campo a otro nombre de entidad definirá una relación uno a uno entre estas dos entidades por defecto.

Diferentes relaciones de entidad (uno a uno, uno a muchos, y muchos-a-muchos) pueden configurarse usando los ejemplos siguientes.

### Relaciones de uno a uno

Las relaciones de uno a uno son el valor por defecto cuando sólo una entidad es asignada a otra.

Ejemplo: Un pasaporte sólo pertenecerá a una persona y una persona sólo tiene un pasaporte (en este ejemplo):

```graphql
type Person @entity {
  id: ID!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

o

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

### Relaciones de Uno a Muchos

Puede usar corchetes cuadrados para indicar que un tipo de campo incluye múltiples entidades.

Ejemplo: Una persona puede tener múltiples cuentas.

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

### Relaciones Muchos-a-Muchos
Una relación muchos-a-muchos puede lograrse implementando una entidad de mapeo para conectar las otras dos entidades.

Ejemplo: Cada persona es parte de múltiples grupos (PersonGrup) y los grupos tienen múltiples personas diferentes (PersonGrup).

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

Además, es posible crear una conexión de la misma entidad en múltiples campos de la entidad media.

Por ejemplo, una cuenta puede tener múltiples transferencias, y cada transferencia tiene una cuenta de origen y destino.

Esto establecerá una relación bidireccional entre dos Cuentas (de y a) a través de la tabla Transferencia.

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

### Búsqueda inversa

Para habilitar una búsqueda inversa en una entidad a una relación, adjunta `@derivedFrom` al campo y apunta a su campo de búsqueda inversa de otra entidad.

Esto crea un campo virtual en la entidad que se puede consultar.

La transferencia "de" una Cuenta es accesible desde la entidad de la Cuenta estableciendo el sentTransfer o el receivedTransfer como teniendo su valor derivado de los respectivos campos from-de y to-para.

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

## Tipo JSON

Estamos soportando guardar datos como un tipo JSON, que es una forma rápida de almacenar datos estructurados. Generaremos automáticamente interfaces JSON correspondientes para consultar estos datos y ahorraremos tiempo definiendo y gestionando entidades.

Recomendamos que los usuarios usen el tipo JSON en los siguientes escenarios:
- Al almacenar datos estructurados en un solo campo es más manejable que la creación de múltiples entidades separadas.
- Guardando las preferencias de usuario clave/valor arbitrario (donde el valor puede ser booleano, textual, o numérico, y no quiere tener columnas separadas para diferentes tipos de datos)
- El esquema es volátil y cambia con frecuencia

### Define la directiva JSON
Define la propiedad como un tipo JSON agregando la anotación `jsonField` en la entidad. Esto automáticamente generará interfaces para todos los objetos JSON en su proyecto bajo `types/interfaces.ts`, y puedes acceder a ellos desde tu función de mapeo.

A diferencia de la entidad, el objeto de directiva jsonField no requiere ningún campo `id`. Un objeto JSON también es capaz de anidar con otros objetos JSON.

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
  contact: [ContactCard] # Almacenar una lista de objetos JSON
}
````

### Consulta de campos JSON

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

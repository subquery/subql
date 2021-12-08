# Le Schema GraphQL

## Définition d'entités

Le fichier `schema.graphql` définit les différents schemas GraphQL. En raison de la façon dont le langage de requête GraphQL fonctionne, le fichier schema dicte essentiellement la forme de vos données venant de SubQuery. Pour en savoir plus sur la façon d'écrire dans le langage de schema GraphQL, nous vous recommandons de consulter [Schemas et Types](https://graphql.org/learn/schema/#type-language).

**Important : Lorsque vous apportez des modifications au fichier schema, veuillez vous assurer que vous régénérez le répertoire de vos types avec la commande suivante `yarn codegen`**

### Entités
Chaque entité doit définir ses champs requis `id` avec le type `ID!`. Il est utilisé comme clé primaire et unique parmi toutes les entités du même type.

Les champs non nullables dans l'entité sont indiqués par `!`. Veuillez consulter l'exemple ci-dessous:

```graphql
type Exemple @entity {
  id: ID! # id field is always required and must look like this
  name: String! # Ceci est un champ obligatoire
  address: String # Ceci est un champ facultatif
}
```

### Les scalaires et les types supportés

Nous prenons actuellement en charge les types de scalars fluides :
- `ID`
- `Int`
- `String`
- `BigInt`
- `Float`
- `Date`
- `Boolean`
- `<EntityName>` pour les entités de relation imbriquées, vous pouvez utiliser le nom de l'entité définie comme l'un des champs. Veuillez consulter la section [Relations avec les entités](#entity-relationships).
- `JSON` peut alternativement stocker des données structurées, voir [type JSON](#json-type)
- `<EnumName>` Les types sont un type spécial de scalaire énuméré qui est limité à un ensemble particulier de valeurs autorisées. Veuillez consulter [Énum Graphql](https://graphql.org/learn/schema/#enumeration-types)

## Indexation par le champ clé non primaire

Pour améliorer les performances de requêtes, indexer un champ d'entité simplement en implémentant l'annotation `@index` sur un champ clé non primaire.

Cependant, nous n'autorisons pas les utilisateurs à ajouter une annotation `@index` à aucun objet [JSON](#json-type). Par défaut, les index sont automatiquement ajoutés aux clés étrangères et pour les champs JSON dans la base de données, mais uniquement pour améliorer les performances du service de requête.

Voici un exemple:

```graphql
type User @entity {
  id: ID!
  name: String! @index(unique: true) # unique peut être défini sur true ou false
  title: Title! # Les index sont automatiquement ajoutés au champ de clé étrangère
}

type Title @entity {
  id: ID!  
  name: String! @index(unique:true)
}
```
En supposant que nous connaissions le nom de cet utilisateur, mais nous ne connaissons pas la valeur exacte de l'id plutôt que d'extraire tous les utilisateurs puis de filtrer par nom, nous pouvons ajouter `@index` derrière le champ de nom. Cela rend la requête beaucoup plus rapide et nous pouvons également passer le `unique : true` pour assurer l'unicité.

**Si un champ n'est pas unique, la taille maximum du champs de résultats est de 100**

Lorsque la génération de code est exécutée, cela créera automatiquement un `getByName` sous le modèle `User` et le champ clé étrangère `titre` créera une méthode `getByTitleId` , qui sont directement accessibles dans la fonction de mapping.

```sql
/* Préparer un enregistrement pour l'entité titre */
INSERT INTO titles (id, name) VALUES ('id_1', 'Captain')
```

```typescript
// Handler dans la fonction de mapping
import {User} from "../types/models/User"
import {Title} from "../types/models/Title"

const jack = await User.getByName('Jack Sparrow');

const captainTitle = await Title.getByName('Captain');

const pirateLords = await User.getByTitleId(captainTitle.id); // List of all Captains
```

## Relations entre entités

Une entité a souvent des relations imbriquées avec d'autres entités. Définir la valeur du champ à un autre nom d'entité définira par défaut une relation entre ces deux entités.

Différentes relations entre les entités (une à une, une à une et plusieurs à plusieurs) peuvent être configurées en utilisant les exemples ci-dessous.

### Relations individuelles

Les relations individuelles sont la valeur par défaut lorsque seule une seule entité est associée à une autre.

Exemple: Un passeport n'appartiendra qu'à une seule personne et une seule personne n'a qu'un passeport (dans cet exemple) :

```graphql
type Person @entity {
  id: ID!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

ou

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

### Relations une à plusieurs

Vous pouvez utiliser des crochets pour indiquer qu'un type de champ contient plusieurs entités.

Exemple: Une personne peut avoir plusieurs comptes.

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

### Relations de plusieurs à plusieurs
Une relation de plusieurs à plusieurs peut être obtenue en implémentant une entité de cartographie pour relier les deux autres entités.

Exemple: Chaque personne fait partie de groupes multiples (Groupe de personnes) et les groupes ont plusieurs personnes différentes (Groupe de personnes).

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

De plus, il est possible de créer une connexion de la même entité dans plusieurs champs de l'entité moyenne.

Par exemple, un compte peut avoir plusieurs transferts, et chaque transfert a un compte source et de destination.

Cela établira une relation bidirectionnelle entre deux comptes clients (de et vers) par le biais de la table de transfert.

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

### Recherche inversée

Pour activer une recherche inversée sur une entité à une relation, attachez `@derivedDe` au champ et pointez vers son champ de recherche inversé d'une autre entité.

Cela crée un champ virtuel sur l'entité qui peut être interrogée.

Le transfert « à partir » d'un compte est accessible à partir de l'entité du compte en définissant la valeur de sentTransfer ou receivedTransfer comme ayant leur valeur dérivée des champs respectifs ou des champs.

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

## Type JSON

Nous prenons en charge l'enregistrement des données en tant que type JSON, ce qui est un moyen rapide de stocker des données structurées. Nous générerons automatiquement les interfaces JSON correspondantes pour interroger ces données et vous économiserons du temps pour définir et gérer les entités.

Nous recommandons aux utilisateurs d'utiliser le type JSON dans les scénarios suivants :
- Lorsque vous stockez des données structurées dans un seul champ est plus facile à gérer que de créer plusieurs entités séparées.
- Sauvegarde des préférences utilisateur de clé arbitraire (où la valeur peut être booléenne, textuelle, ou numérique, et vous ne voulez pas avoir de colonnes séparées pour différents types de données)
- Le schema est volatil et évolue fréquemment

### Définissez la directive JSON
Définissez la propriété en tant que type JSON en ajoutant l'annotation `jsonField` dans l'entité. Cela générera automatiquement des interfaces pour tous les objets JSON de votre projet sous `types/interfaces.ts`, et vous pouvez y accéder dans votre fonction de mapping.

Contrairement à l'entité, l'objet directive jsonField ne nécessite aucun champ `id`. Un objet JSON est également capable de s'imbriquer avec d'autres objets JSON.

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
  contact: [ContactCard] # Stocker une liste d'objets JSON
}
````

### Requête des champs JSON

L'inconvénient d'utiliser des types JSON se retrouve sur l'efficacité de la requête lors du filtrage, comme chaque fois qu'il effectue une recherche de texte, cela se fait sur l'entité entière.

Cependant, l'impact est acceptable dans notre service de requêtes. Voici un exemple de comment utiliser l'opérateur `contient` dans la requête GraphQL sur un champ JSON pour trouver les 5 premiers utilisateurs qui possèdent un numéro de téléphone qui contient '0064'.

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

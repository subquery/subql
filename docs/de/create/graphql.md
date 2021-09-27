# GraphQL-Schema

## Definieren von Entitäten

Die `schema.graphql` Datei definiert die verschiedenen GraphQL Schemas. Aufgrund der Funktionsweise der GraphQL-Abfragesprache bestimmt die Schemadatei im Wesentlichen die Form Ihrer Daten aus SubQuery. Um mehr über das Schreiben in der GraphQL-Schemasprache zu erfahren, empfehlen wir Ihnen, sich [Schemas und Typen](https://graphql.org/learn/schema/#type-language) anzusehen.

**Wichtig: Wenn Sie Änderungen an der Schemadatei vornehmen, stellen Sie bitte sicher, dass Sie Ihr Typenverzeichnis mit dem folgenden Befehl `yarn codegen`. neu generieren**

### Entitäten
Jede Entität muss ihre Pflichtfelder `id` mit dem Typ `ID!` definieren. Er wird als Primärschlüssel verwendet und ist unter allen Entitäten desselben Typs eindeutig.

Felder, die keine Null-Werte enthalten können, sind in der Entität durch gekennzeichnet Bitte sehen Sie das Beispiel unten:

```graphql
Typ Beispiel @entity {
    id: ID! # id-Feld ist immer erforderlich und muss so aussehen
   name: String! # Das ist ein Pflichtfeld
   address: String # Dies ist ein optionales Feld
}
```

### Unterstützte Skalare und Typen

Wir unterstützen derzeit fließende Skalartypen:
- `ID`
- `Int`
- `String`
- `BigInt`
- `Datum`
- `Boolean`
- `<EntityName>` für verschachtelte Beziehungsentitäten können Sie den Namen der definierten Entität als eines der Felder verwenden. Siehe [Beziehungen zu Entitäten](#entity-relationships).
- `JSON` kann strukturierte Daten alternativ speichern, siehe [JSON-Typ](#json-type)

## Indizierung nach Nicht-Primärschlüssel-Feld

Um die Abfrageleistung zu verbessern, indizieren Sie ein Entitätsfeld einfach, indem Sie die Annotation `@index` in einem Nicht-Primärschlüsselfeld implementieren.

Allerdings erlauben wir Benutzern nicht, `@index` Anmerkungen zu irgendeinem [JSON](#json-type) Objekt hinzuzufügen. Standardmäßig werden Indizes automatisch zu Fremdschlüsseln und für JSON-Felder in der Datenbank hinzugefügt, jedoch nur, um die Leistung des Abfragedienstes zu verbessern.

Hier ist ein Beispiel.

```graphql
type User @entity {
  id: ID!
  name: String! @index(unique: true) #  kann auf wahr oder falsch
  Titel gesetzt werden!
  title: Title! # Indizes werden automatisch zum Fremdschlüsselfeld hinzugefügt
}

type Title @entity {
  id: ID!  
  name: String! @index(unique:true)
}
```
Angenommen, wir kennen den Namen dieses Benutzers, kennen aber nicht den genauen ID-Wert, anstatt alle Benutzer zu extrahieren und dann nach Namen zu filtern, können wir `@index` hinter dem Namensfeld hinzufügen. Dies macht die Abfrage viel schneller und wir können zusätzlich das `unique: true` übergeben, um die Eindeutigkeit zu gewährleisten.

**Wenn ein Feld nicht eindeutig ist, ist die maximale Ergebnismenge 100**

Wenn die Codegenerierung ausgeführt wird, wird automatisch ein `getByName` nach dem `Benutzer`-Modell erstellt, und das Fremdschlüsselfeld `Titel` erstellt ein ` getByTitleId`-Methode, die beide direkt in der Mapping-Funktion aufgerufen werden können.

```sql
/* Vorbereitung eines Datensatzes für die Titelentität */
INSERT INTO titles (id, name) VALUES ('id_1', 'Captain')
```

```typescript
// Handler in der Mapping-Funktion
import {User} from "../types/models/User"
import {Title} from "../types/models/Title"

const jack = await User.getByName('Jack Sparrow');

const captainTitle = await Title.getByName('Captain');

const pirateLords = await User.getByTitleId(captainTitle.id); // Liste aller Captains
```

## Entitäts-Beziehungen

Eine Entität hat oft verschachtelte Beziehungen zu anderen Entitäten. Wenn Sie den Feldwert auf einen anderen Entitätsnamen festlegen, wird standardmäßig eine Eins-zu-Eins-Beziehung zwischen diesen beiden Entitäten definiert.

Anhand der folgenden Beispiele können verschiedene Entitätsbeziehungen (eins-zu-eins, eins-zu-viele und viele-zu-viele) konfiguriert werden.

### Ein-zu-Eins-Beziehungen

Eins-zu-eins-Beziehungen sind die Standardeinstellung, wenn nur eine einzelne Entität einer anderen zugeordnet wird.

Beispiel: Ein Reisepass gehört nur einer Person und eine Person hat nur einen Reisepass (in diesem Beispiel):

```graphql
type Person @entity {
  id: ID!
}

type Passport @entity {
  id: ID!
  Besitzer: Person!
}
```

oder

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

### One-to-Many Beziehungen

Sie können eckige Klammern verwenden, um anzugeben, dass ein Feldtyp mehrere Entitäten enthält.

Beispiel: Eine Person kann mehrere Konten haben.

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

### Viele-zu-Viele-Beziehungen
Eine Viele-zu-Viele-Beziehung kann erreicht werden, indem eine Abbildungsentität implementiert wird, um die anderen beiden Entitäten zu verbinden.

Beispiel: Jede Person ist Teil mehrerer Gruppen (PersonGroup) und Gruppen haben mehrere verschiedene Personen (PersonGroup).

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

Außerdem ist es möglich, eine Verbindung derselben Entität in mehreren Feldern der mittleren Entität zu erstellen.

Ein Konto kann beispielsweise über mehrere Überweisungen verfügen und jede Überweisung hat ein Quell- und ein Zielkonto.

Dadurch wird eine bidirektionale Beziehung zwischen zwei Konten (von und zu) über die Transfertabelle hergestellt.

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

### Reverse-Lookups

Um eine umgekehrte Suche einer Entität zu einer Beziehung zu ermöglichen, hängen Sie `@derivedFrom` an das Feld an und zeigen Sie auf ihr umgekehrtes Nachschlagefeld einer anderen Entität.

Dadurch wird ein virtuelles Feld auf der Entität erstellt, das abgefragt werden kann.

Auf die Überweisung "von" einem Konto kann von der Kontoentität aus zugegriffen werden, indem der Wert von sentTransfer oder ReceivedTransfer so eingestellt wird, dass ihr Wert aus den entsprechenden from- oder to-Feldern abgeleitet wird.

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

Wir unterstützen das Speichern von Daten als JSON-Typ, was eine schnelle Möglichkeit zum Speichern strukturierter Daten darstellt. Wir generieren automatisch entsprechende JSON-Schnittstellen zum Abfragen dieser Daten und sparen Ihnen Zeit beim Definieren und Verwalten von Entitäten.

Wir empfehlen Benutzern, den JSON-Typ in den folgenden Szenarien zu verwenden:
- Das Speichern strukturierter Daten in einem einzelnen Feld ist einfacher zu verwalten als das Erstellen mehrerer separater Entitäten.
- Speichern beliebiger Schlüssel/Wert-Benutzereinstellungen (wobei der Wert boolesch, textuell oder numerisch sein kann und Sie keine separaten Spalten für verschiedene Datentypen haben möchten)
- Das Schema ist flüchtig und ändert sich häufig

### JSON-Direktive definieren
Definieren Sie die Eigenschaft als JSON-Typ, indem Sie die Annotation `jsonField` in der Entität hinzufügen. Dadurch werden automatisch Schnittstellen für alle JSON-Objekte in Ihrem Projekt unter `types/interfaces.ts` generiert, auf die Sie in Ihrer Mapping-Funktion zugreifen können.

Im Gegensatz zur Entität erfordert das jsonField-Direktivenobjekt kein `id`-Feld. Ein JSON-Objekt kann auch mit anderen JSON-Objekten verschachtelt werden.

````graphql
schreibe AddressDetail @jsonField {
   street: String!
  district: String!
}

type ContactCard @jsonField {
  phone: String!
  address: AddressDetail # Nested JSON
}

type User @entity {
  id: ID! 
  contact: [ContactCard] # Speichern Sie eine Liste von JSON-Objekten
}
````

### Abfragen von JSON-Feldern

Der Nachteil der Verwendung von JSON-Typen ist eine geringfügige Auswirkung auf die Abfrageeffizienz beim Filtern, da es sich bei jeder Textsuche um die gesamte Entität handelt.

Die Auswirkungen sind in unserem Abfrageservice jedoch noch akzeptabel. Hier ist ein Beispiel für die Verwendung des Operators `enthält` in der GraphQL-Abfrage für ein JSON-Feld, um die ersten fünf Benutzer zu finden, die eine Telefonnummer besitzen, die „0064“ enthält.

```graphql
#Um die ersten 5 Benutzer zu finden, enthält die eigene Telefonnummer '0064'.

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

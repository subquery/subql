# Manifest-Datei

Die Datei Manifest `project.yaml` kann als Einstiegspunkt Ihres Projekts angesehen werden und definiert die meisten Details darüber, wie SubQuery die Kettendaten indiziert und transformiert.

Das Manifest kann entweder im YAML- oder im JSON-Format vorliegen. In diesem Dokument verwenden wir YAML in allen Beispielen. Unten ist ein Standardbeispiel für eine einfache `project.yaml`.

``` yml
specVersion: "0.0.1"
description: ""
repository: "https://github.com/subquery/subql-starter"

schema: "./schema.graphql"

network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"
  # Optionally provide the HTTP endpoint of a full chain dictionary to speed up processing
  dictionary: "https://api.subquery.network/sq/subquery/dictionary-polkadot"

dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
        - handler: handleEvent
          kind: substrate/EventHandler
          filter: #Filter is optional but suggested to speed up event processing
            module: balances
            method: Deposit
        - handler: handleCall
          kind: substrate/CallHandler
```

- `network.endpoint` defines the wss or ws endpoint of the blockchain to be indexed - **This must be a full archive node**.
- `network.dictionary` stellt optional den HTTP-Endpunkt eines vollständigen Kettenwörterbuchs bereit, um die Verarbeitung zu beschleunigen - siehe [Ausführen eines Indexers](../run/run.md#using-a-dictionary)
- `dataSources` definiert die Daten, die gefiltert und extrahiert werden, sowie die Position des Mapping-Funktionshandlers für die anzuwendende Datentransformation.
  - `kind` unterstützt vorerst nur `Substrat/Runtime`.
  - `startBlock` gibt die Blockhöhe an, ab der die Indizierung gestartet werden soll.
  - `filter` filtert die auszuführende Datenquelle nach dem Netzwerk-Endpunkt-Spezifikationsnamen, siehe [Netzwerkfilter](#network-filters)
  - `mapping.handlers` listet alle [Mapping-Funktionen](./mapping.md) und ihre entsprechenden Handler-Typen mit zusätzlichen [Mapping-Filtern](#mapping-filters) auf.

## Netzwerkfilter

Normalerweise erstellt der Benutzer eine SubQuery und erwartet, sie sowohl für seine Testnet- als auch für seine Mainnet-Umgebungen (z. B. Polkadot und Kusama) wiederzuverwenden. Zwischen Netzwerken sind wahrscheinlich verschiedene Optionen unterschiedlich (z. B. Index-Startblock). Daher ermöglichen wir es Benutzern, für jede Datenquelle unterschiedliche Details zu definieren, was bedeutet, dass ein SubQuery-Projekt immer noch in mehreren Netzwerken verwendet werden kann.

Benutzer können einen `Filter` für `dataSources` hinzufügen, um zu entscheiden, welche Datenquelle in jedem Netzwerk ausgeführt werden soll.

Unten sehen Sie ein Beispiel, das verschiedene Datenquellen für das Polkadot- und das Kusama-Netzwerk zeigt.

```yaml
...
...
network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"

#Erstellen Sie eine Vorlage, um Redundanzen zu vermeiden
Definitionen:
  mapping: &mymapping
    handlers:
      - handler: handleBlock
        kind: substrate/BlockHandler

dataSources:
  - name: polkadotRuntime
    kind: substrate/Runtime
    filter:  #Optional
        specName: polkadot
    startBlock: 1000
    mapping: *mymapping #use template here
  - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapping: *mymapping # can reuse or change
```

## Zuordnungsfilter

Mapping-Filter sind eine äußerst nützliche Funktion, um zu entscheiden, welcher Block, welches Ereignis oder welcher Extrinsic einen Mapping-Handler auslöst.

Nur eingehende Daten, die die Filterbedingungen erfüllen, werden von den Mapping-Funktionen verarbeitet. Zuordnungsfilter sind optional, werden jedoch empfohlen, da sie die von Ihrem SubQuery-Projekt verarbeitete Datenmenge erheblich reduzieren und die Indexierungsleistung verbessern.

```yaml
#Beispielfilter von callHandler
Filter: 
    module: balances
   method: Deposit
   success: true
```

In der folgenden Tabelle werden Filter erläutert, die von verschiedenen Handlern unterstützt werden.

| Handler                                    | Unterstützter Filter         |
| ------------------------------------------ | ---------------------------- |
| [Blockhandler](./mapping.md#block-handler) | `specVersion`                |
| [Eventhandler](./mapping.md#event-handler) | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)   | `module`,`method` ,`success` |


-  Modul- und Methodenfilter werden auf jeder substratbasierten Kette unterstützt.
- Der Filter `Erfolg` nimmt einen booleschen Wert an und kann verwendet werden, um den Extrinsischen nach seinem Erfolgsstatus zu filtern.
- Der Filter `specVersion` gibt den Spezifikationsversionsbereich für einen Substratblock an. In den folgenden Beispielen wird beschrieben, wie Versionsbereiche festgelegt werden.

```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index Block mit specVersion größer oder gleich 100.
  specVersion: [null, 23] #Indexblock mit specVersion kleiner oder gleich 23.
```

## Kundenspezifische Ketten

Sie können Daten aus benutzerdefinierten Ketten indizieren, indem Sie auch Kettentypen in die `project.yaml` aufnehmen. Deklarieren Sie die spezifischen Typen, die von dieser Blockchain unterstützt werden, in `network.types`. Wir unterstützen die zusätzlichen Typen, die von Substrat-Laufzeitmodulen verwendet werden.

`typesAlias`, `typesBundle`, `typesChain`, und `typesSpec` werden ebenfalls unterstützt.

``` yml
specVersion: "0.0.1"
description: "Diese SubQuery indiziert die Geburtsdaten von Kätzchen"
repository: "https://github.com/onfinality-io/subql-examples"
schema: "./schema.graphql"
network:
  endpoint: "ws://host.kittychain.io/public-ws"
  types: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]"
  }
# typesChain: { chain: { Type5: 'example' } }
# typesSpec: { spec: { Type6: 'example' } }
dataSources:
  - name: runtime
    kind: substrate/Runtime
    startBlock: 1
    filter:  #Optional
      specName: kitty-chain 
    mapping:
      handlers:
        - handler: handleKittyBred
          kind: substrate/CallHandler
          filter:
            module: kitties
            method: breed
            success: true
```

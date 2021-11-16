# Tutorials & Examples

In der [Kurzanleitung](/quickstart/quickstart.md) haben wir sehr schnell ein Beispiel durchgespielt, um Ihnen einen Eindruck davon zu geben, was SubQuery ist und wie es funktioniert. Hier sehen wir uns den Workflow beim Erstellen Ihres Projekts und die Schlüsseldateien, mit denen Sie arbeiten, genauer an.

## SubQuery Examples

Einige der folgenden Beispiele gehen davon aus, dass Sie das Startpaket im Abschnitt [Schnellstart](../quickstart/quickstart.md) erfolgreich initialisiert haben. Ausgehend von diesem Startpaket durchlaufen wir den Standardprozess zum Anpassen und Implementieren Ihres SubQuery-Projekts.

1. Initialise your project using `subql init --specVersion 0.2.0 PROJECT_NAME`. alternatively you can use the old spec version `subql init PROJECT_NAME`
2. Aktualisieren Sie die Manifestdatei (`project.yaml`), um Informationen über Ihre Blockchain und die zuzuordnenden Entitäten aufzunehmen – siehe [Manifestdatei](./manifest.md)
3. Erstellen Sie GraphQL-Entitäten in Ihrem Schema (`schema.graphql`), die die Form der Daten definieren, die Sie extrahieren und für die Abfrage beibehalten – siehe [GraphQL-Schema](./graphql.md)
4. Fügen Sie alle Mapping-Funktionen (zB `mappingHandlers.ts`) hinzu, die Sie aufrufen möchten, um Kettendaten in die von Ihnen definierten GraphQL-Entitäten umzuwandeln - siehe [Mapping](./mapping.md)
5. Generieren, erstellen und veröffentlichen Sie Ihren Code in SubQuery-Projekten (oder führen Sie ihn in Ihrem eigenen lokalen Knoten aus) - siehe [Starterprojekt ausführen und abfragen](./quickstart.md#running-and-querying-your-starter-project) in unserer Kurzanleitung.

## Verzeichnisaufbau

Die folgende Übersicht bietet einen Überblick über die Verzeichnisstruktur eines SubQuery-Projekts, wenn der Befehl `init` ausgeführt wird.

```
- project-name
  L package.json
  L project.yaml
  L README.md
  L schema.graphql
  L tsconfig.json
  L docker-compose.yml
  L src
    L index.ts
    L mappings
      L mappingHandlers.ts
  L .gitignore
```

Example

![SubQuery-Verzeichnisstruktur](/assets/img/subQuery_directory_stucture.png)

## Codegenerierung

Immer wenn Sie Ihre GraphQL-Entitäten ändern, müssen Sie Ihr Typenverzeichnis mit dem folgenden Befehl neu generieren.

```
yarn codegen
```

Dadurch wird ein neues Verzeichnis erstellt (oder das vorhandene aktualisiert) `src/types`, das generierte Entitätsklassen für jeden Typ enthält, den Sie zuvor in `schema.graphql` definiert haben. Diese Klassen bieten typsicheres Laden von Entitäten sowie Lese- und Schreibzugriff auf Entitätsfelder. Weitere Informationen zu diesem Prozess finden Sie im [GraphQL-Schema](./graphql.md).

## Bauen

Um Ihr SubQuery-Projekt auf einem lokal gehosteten SubQuery-Knoten auszuführen, müssen Sie zuerst Ihre Arbeit erstellen.

Führen Sie den Build-Befehl aus dem Stammverzeichnis des Projekts aus.

<CodeGroup> Die `console.log` Methode wird **nicht mehr unterstützt**. Stattdessen wurde ein `Logger`-Modul in die Typen eingefügt, was bedeutet, dass wir einen Logger unterstützen können, der verschiedene Logging-Level akzeptiert.

```typescript
# Yarn
yarn build

# NPM
npm run-script build
```

Um `logger.info` oder `logger.warn`zu verwenden, legen Sie die Zeile einfach in Ihre Mapping-Datei ein.

![logging.info](/assets/img/logging_info.png)

Um `logger.debug`zu verwenden, ist ein zusätzlicher Schritt erforderlich. Fügen Sie `--log-level=debug` zu Ihrer Befehlszeile hinzu.

Wenn Sie einen Docker-Container ausführen, fügen Sie diese Zeile zu Ihrer Datei `docker-compose.yaml` hinzu.

![logging.debug](/assets/img/logging_debug.png)

Sie sollten nun die neue Protokollierung auf dem Terminalbildschirm sehen.

![logging.debug](/assets/img/subquery_logging.png)

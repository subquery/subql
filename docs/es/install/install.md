# Instalar SubQuery

Hay varios componentes requeridos al crear un proyecto SubQuery. La herramienta [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) se utiliza para crear proyectos de SubQuery. El componente [@subql/node](https://github.com/subquery/subql/tree/docs-new-section/packages/node) es requerido para ejecutar un indexador. La librería [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query) es necesaria para generar consultas.

## Install @subql/cli

La herramienta [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) ayuda a crear un framework de proyecto o un scaffold que significa que no tiene que empezar desde cero.

Instalar SubQuery CLI globalmente en tu terminal usando Yarn o NPM:

<CodeGroup> # Yarn yarn global add @subql/cli # NPM npm install -g @subql/cli
## Install @subql/node

Un nodo de SubQuery es una implementación que extrae datos de blockchain basados en substrate por el proyecto SubQuery y lo guarda en una base de datos de Postgres.

Instala el nodo SubQuery globalmente en tu terminal usando Yarn o NPM:

<CodeGroup> # Yarn yarn global add @subql/node # NPM npm install -g @subql/node
> Nota: Si estás usando Docker o alojando tu proyecto en Proyectos de SubQuery, puedes saltarte este paso. Esto se debe a que el nodo SubQuery ya se proporciona en el contenedor Docker y en la infraestructura de alojamiento.

## Install @subql/query

La biblioteca de consultas de SubQuery proporciona un servicio que le permite consultar su proyecto en un entorno de "playground" a través de su navegador.

Instala la consulta de SubQuery globalmente en tu terminal usando Yarn o NPM:

<CodeGroup> <CodeGroupItem title="YARN" active> # Yarn yarn global add @subql/query # NPM npm install -g @subql/query </CodeGroupItem>
<CodeGroupItem title="NPM"> subql-node &lt;command&gt; </CodeGroupItem> </CodeGroup>

> Nota: Si estás usando Docker o alojando tu proyecto en Proyectos de SubQuery, puedes saltarte este paso también. Esto se debe a que el nodo SubQuery ya se proporciona en el contenedor Docker y en la infraestructura de alojamiento. 
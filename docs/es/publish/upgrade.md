# Deploy a New Version of your SubQuery Project

## Indicaciones

Aunque siempre tienes la libertad de actualizar e implementar nuevas versiones de tu proyecto SubQuery, por favor tenga en cuenta durante este proceso si su proyecto SubQuery es público para el mundo. Algunos puntos clave a tener en cuenta:
- Si su actualización es un cambio de ruptura, cree un nuevo proyecto (p. ej. `Mi SubQuery Project V2`) o advierte a tu comunidad de los cambios a través de los canales de las redes sociales.
- El despliegue de una nueva versión del proyecto SubQuery causa algún tiempo de inactividad a medida que la nueva versión indexa la cadena completa del bloque de génesis.

## Desplegar Cambios

Login to SubQuery Projects, and find the project that you want to deploy a new version of. Puede elegir entre desplegar en la zona de producción o de puesta en escena. Estos dos espacios son entornos aislados y cada uno tiene sus propias bases de datos y sincronizan de forma independiente.

Recomendamos desplegar en su puesto de trabajo sólo para las pruebas finales de puesta en escena o cuando necesite resinc los datos de su proyecto. Entonces se puede promover a la producción sin tiempo de inactividad. Encontrarás que probar es más rápido cuando [ejecute un proyecto localmente](../run/run.md) ya que puedes más [depurar fácilmente problemas](../tutorials_examples/debug-projects.md).

La ranura de montaje es perfecta para:
* Validación final de los cambios en su SubQuery Project en un entorno separado. La ranura de staging (montaje) tiene una URL diferente a la de producción que puedes usar en tus dApps.
* Calentando e indexando datos para un proyecto actualizado de SubQuery para eliminar los tiempos de inactividad en tu dApp
* Preparando una nueva versión para su SubQuery Project sin exponerla públicamente. El espacio para escenarios no se muestra al público en el explorador y tiene una URL única que solo es visible para usted.

![Ranura provisional](/assets/img/staging_slot.png)

#### Actualizar al último Indexador y Servicio de Consultas

Si solo desea actualizar al último indexador ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) o al servicio de consulta ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) para aprovechar nuestras mejoras regulares de rendimiento y estabilidad, sólo tiene que seleccionar una versión más reciente de nuestros paquetes y guardar. Esto solo causará unos minutos de inactividad.

#### Desplegar nueva versión de tu SubQuery Project

Rellena el Hash de Compromiso desde GitHub (copia el hash de commit completo) de la versión de tu proyecto de SubQuery código base que quieras desplegar. Esto causará un tiempo de inactividad más largo dependiendo del tiempo que tarda en indexar la cadena actual. Siempre puede reportar aquí para que avance.

## Siguiente paso - Conéctese a su proyecto
Una vez que el despliegue se ha completado correctamente y nuestros nodos han indexado sus datos de la cadena, podrás conectarte a tu proyecto a través del punto final de la Consulta mostrada.

![Proyecto en despliegue y sincronización](/assets/img/projects-deploy-sync.png)

Alternativamente, puedes hacer clic en los tres puntos al lado del título de tu proyecto, y verlo en SubQuery Explorer. Allí puedes usar el playground del navegador para empezar - [lee más sobre cómo usar nuestro explorador aquí](../query/query.md).

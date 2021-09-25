# Preguntas Frecuentes

## ¿Qué es SubQuery?

SubQuery es un proyecto de código abierto que permite a los desarrolladores indexar, transformar y consultar datos en cadena de Substrate para potenciar sus aplicaciones.

SubQuery también proporciona alojamiento gratuito con grado de producción de proyectos para desarrolladores, eliminando la responsabilidad de la infraestructura de gestión y dejar que los desarrolladores hagan lo que hacen mejor - construir.

## ¿Cuál es la mejor manera de comenzar con SubQuery?

La mejor manera de empezar con SubQuery es probar nuestro [tutorial de Hola Mundo](../quickstart/helloworld-localhost.md). Este es un simple paseo de 5 minutos para descargar la plantilla de inicio, construir el proyecto, y luego usar Docker para ejecutar un nodo en su localhost y ejecutar una simple consulta.

## ¿Cómo puedo contribuir o dar comentarios a SubQuery?

Nos encantan las contribuciones y comentarios de la comunidad. Para contribuir con el código, bifurca el repositorio de interés y realice sus cambios. Luego envíe un PR o Pull Request. ¡Oh, no te olvides del test probar también! Consulte también nuestras líneas de guía de contribuciones (TBA).

Para dar comentarios, contáctanos a hello@subquery.network o salta a nuestro [canal de discord](https://discord.com/invite/78zg8aBSMG)

## ¿Cuánto cuesta alojar mi proyecto en SubQuery Projects?

Hospedar tu proyecto en SubQuery Projects es absolutamente gratuito - es nuestra manera de devolver a la comunidad. Para aprender cómo alojar tu proyecto con nosotros, por favor revisa el tutorial [Hola Mundo (hospedado en SubQuery)](../quickstart/helloworld-hosted.md).

## ¿Qué son las ranuras de despliegue?

Las ranuras de despliegue son una característica en [SubQuery Proyects](https://project.subquery.network) que es el equivalente a un entorno de desarrollo. Por ejemplo, en cualquier organización de software normalmente hay un entorno de desarrollo y un entorno de producción como mínimo (ignorando que localhost lo está). Normalmente se incluyen entornos adicionales como la puesta en escena y pre-prod o incluso el QA dependiendo de las necesidades de la organización y de su configuración de desarrollo.

SubQuery tiene actualmente dos espacios disponibles. Una ranura de montaje y una ranura de producción. Esto permite a los desarrolladores desplegar su SubQuery en el entorno de instalación y si todo va bien, "promover a la producción" con el clic de un botón.

## ¿Cuál es la ventaja de una rama en escena?

El principal beneficio de usar una ranura de montaje es que te permite preparar una nueva versión de tu proyecto SubQuery sin exponerlo públicamente. Puede esperar a que la ranura de puesta en escena vuelva a indexar todos los datos sin afectar a sus aplicaciones de producción.

El espacio para escenarios no se muestra al público en el [explorador](https://explorer.subquery.network/) y tiene una URL única que solo es visible para usted. Y, por supuesto, el entorno separado le permite probar su nuevo código sin afectar a la producción.

## ¿Qué son los extrínsecos?

Si ya estás familiarizado con los conceptos de blockchain, puedes pensar en los extrinsecos como comparables a las transacciones. Sin embargo, más formalmente un extrínseco es una pieza de información que viene de fuera de la cadena y está incluida en un bloque. Hay tres categorías de extrínsecos. Son inherentes, transacciones firmadas y transacciones no firmadas.

Los extrínsecos inherentes son piezas de información que no están firmadas y sólo insertadas en un bloque por el autor del bloque.

Los extrinsics de transacción firmada son transacciones que contienen una firma de la cuenta que emitió la transacción. Pagarán una comisión para que la transacción esté incluida en la cadena.

Las transacciones extrínsecas no firmadas son transacciones que no contienen una firma de la cuenta que emitió la transacción. Las transacciones extrínsecas no firmadas deben ser utilizadas con cuidado porque no hay nadie que pague una cuota, porque está firmada. Debido a esto, la cola de transacciones carece de lógica económica para prevenir el spam.

Para más información, haz clic [aquí](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics).

## ¿Cuál es el punto final para la red Kusama?

El network.endpoint para la red de Kusama es `wss://kusama.api.onfinality.io/public-ws`.

## ¿Cuál es el punto final para la red principal Polkadot?

El network.endpoint para la red Polkadot es `wss://polkadot.api.onfinality.io/public-ws`.

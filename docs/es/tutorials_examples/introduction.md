# Tutoriales & Ejemplos

Aquí listaremos nuestros tutoriales y exploraremos varios ejemplos para ayudarle a ponerse en marcha de la manera más fácil y rápida.

## Tutoriales



## Proyectos de Ejemplo de SubQuery

| Ejemplo                                                                                           | Descripción                                                                                                                                        | Temas                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [bloque extrínseco-finalizado-](https://github.com/subquery/tutorials-extrinsic-finalised-blocks) | Indexa extrinsics para que puedan ser consultados por su hash                                                                                      | El ejemplo más simple con una función de manejador de bloques ____                                                                 |
| [block-timestamp](https://github.com/subquery/tutorials-block-timestamp)                          | Indices marca de tiempo de cada bloque finalizado                                                                                                  | Otra función de controlador de llamada __call handler__                                                                            |
| [umbral de validador](https://github.com/subquery/tutorials-validator-threshold)                  | Indexa la cantidad mínima de apuesta requerida para que un validador sea elegido.                                                                  | Función __manejador de bloques__ más complicada que hace __llamadas externas__ al `@polkadot/api` para datos adicionales en cadena |
| [sum-reward](https://github.com/subquery/tutorials-sum-reward)                                    | Indexa apostando bonos, recompensas y barridos de los eventos del bloque finalizado                                                                | Más complicados__Controladores de eventos__ con una relación __de uno a muchos__                                                   |
| [relación de entidad](https://github.com/subquery/tutorials-entity-relations)                     | Indexa las transferencias de saldo entre cuentas, también indexa el batchAll de utilidades para averiguar el contenido de las llamadas extrínsecas | __uno-a-muchos__ y __muchos-a-muchos__ relaciones y complicada __manejo extrínseco__                                               |
| [gatito](https://github.com/subquery/tutorials-kitty-chain)                                       | Indica la información de nacimiento de los gatitos.                                                                                                | Manejadores complejos de llamadas ____ y __controladores de eventos__con indexados de datos de una __cadena personalizada__        |

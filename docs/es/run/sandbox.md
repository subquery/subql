# El Sandbox

En nuestro escenario de uso visionado, el nodo SubQuery es generalmente ejecutado por un host de confianza, y el código del proyecto SubQuery enviado por el usuario al nodo no es del todo fiable.

Es probable que algún código malicioso ataque al anfitrión o incluso lo comprometa, y causar daños a los datos de otros proyectos en el mismo anfitrión. Por lo tanto, utilizamos el mecanismo protegido de sandbox [VM2](https://www.npmjs.com/package/vm2) para reducir los riesgos. Esto:

- Ejecuta código no confiable de forma segura en un contexto aislado y código malicioso no accederá a la red y al sistema de archivos del host a menos que a través de la interfaz expuesta inyectemos en el sandbox.

- Llama de forma segura a métodos e intercambia datos y callbacks entre sandboxes.

- Es inmune a muchos métodos conocidos de ataque.


## Restricción

- Para limitar el acceso a ciertos módulos integrados, solo `assert`, `buffer`, `crypto`,`util` y `path` están en la lista blanca.

- Soportamos [módulos de terceros](../create/mapping.md#third-party-libraries) escritos en **CommonJS** y **bibliotecas híbridas** como `@polkadot/*` que usan ESM por defecto.

- Cualquier módulo que utilice `HTTP` y `WebSocket` está prohibido.

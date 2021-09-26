# ¿Cómo depurar un proyecto SubQuery?

## Guía en vídeo

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/6NlaO-YN2q4" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Introducción

Para depurar proyectos de SubQuery como pasar por el código, establecer puntos de interrupción y inspeccionar variables, tendrá que usar un Node.js inspector en conjunto con las herramientas de desarrollo de Chrome.

## Inpector del nodo

Ejecuta el siguiente comando en tu terminal.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

Por ejemplo:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```

## Devtools de Chrome

Abra Chrome DevTools y vaya a la pestaña Fuentes. Tenga en cuenta que hacer clic en el icono verde abrirá una nueva ventana.

![inpector del nodo](/assets/img/node_inspect.png)

Vaya a Filesystem y añada la carpeta del proyecto al área de trabajo. Luego abra la carpeta dist > mapeos y seleccione el código que desea depurar. Luego pase por el código como cualquier herramienta de depuración estándar.

![depuración de proyectos](/assets/img/debugging_projects.png)

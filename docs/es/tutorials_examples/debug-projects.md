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

For example:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```

## Chrome devtools

Open up Chrome DevTools and navigate to the Sources tab. Note that clicking on the green icon will open up a new window.

![node inspect](/assets/img/node_inspect.png)

Navigate to Filesystem and add your project folder to the workspace. Then open the dist > mappings folder and select the code you wish to debug. Then step through the code as with any standard debugging tool.

![debugging projects](/assets/img/debugging_projects.png)

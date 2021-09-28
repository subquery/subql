# Как отлаживать проект SubQuery?

## Видео гайд

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/6NlaO-YN2q4" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Вступление

Для отладки проектов SubQuery, таких как пошаговое выполнение кода, установка брейкпоинтов и проверка переменных, вам придется использовать Node.js inspector в сочетании с инструментами разработчика Chrome.

## Node inspector

Выполните следующую команду на экране терминала.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

Например:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
Для помощи смотрите: https://nodejs.org/en/docs/inspector 
Прилагается отладчик.
```

## Инструменты разработчика Chrome

Откройте Chrome DevTools и перейдите на вкладку «Источники». Обратите внимание, что при нажатии на зеленый значок откроется новое окно.

![node inspect](/assets/img/node_inspect.png)

Перейдите в Файловую систему и добавьте папку проекта в рабочую область. Затем откройте dist > mappings и выберите код, который хотите отлаживать. Затем выполните код, как и в любом стандартном инструменте отладки.

![debugging projects](/assets/img/debugging_projects.png)

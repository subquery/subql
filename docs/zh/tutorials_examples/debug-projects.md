# 如何调试一个SubQuery项目？

## 视频教程

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/6NlaO-YN2q4" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 介绍

为了调试SubQuery项目，例如通过代码、设置breakpoints和检查变量，您必须使用一个Node.js 监视器与 Chrome 开发者工具结合使用

## 节点监视器

在终端屏幕上运行以下命令。

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

例如：
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```

## Chrome 开发工具

打开Chrome DevTools 并导航到源标签页。 注意，点击绿色图标将打开一个新窗口。

![节点查看](/assets/img/node_inspect.png)

导航到文件系统并将您的项目文件夹添加到工作区。 然后打开dist > 映射文件夹并选择你想要调试的代码。 然后跟任何标准调试工具一样来完成代码。

![调试项目](/assets/img/debugging_projects.png)

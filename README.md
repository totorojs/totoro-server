![totoro](https://f.cloud.github.com/assets/340282/891339/657d9018-fa54-11e2-9760-6955388fd8fc.jpg)

# totoro-server

totoro 的服务端。

最新版本：v0.4.1

---

## 1. 安装

### node 版本要求

    >= 0.10.12

### 从 npm 安装

    $ sudo npm install totoro-server -g

### 从 Github 安装

可以体验开发中的最新功能

    $ git clone git@github.com:totorojs/totoro-server.git
    $ cd totoro-server
    $ sudo npm install -g

## 2. 快速上手

    $ totoro-server --verbose

然后使用任意浏览器访问 {{ip}}:9999 页面即可成为测试浏览器。PC 端浏览器需要手工设置下 [允许弹出窗口](https://github.com/totorojs/totoro-server/wiki/Popup-Settings.zh)

## 3. 命令行配置项

#### --verbose

显示 debug 日志。

默认：false

#### --server-host

服务 host。

默认：本机 ip

#### --server-port

服务 port。

默认：9999

#### --insert-scripts

指定 {{ip}}:9999 页面额外插入的脚本，多个用逗号分隔。

## 4. 配置文件

会自动读取启动时所在目录是否有 totoro-server-config.json，配置项使用的是 **首字母小写的驼峰式命名**。

## 5. 关于

totoro 的名字来自于宫崎骏导演的奇幻动画电影《龙猫》。

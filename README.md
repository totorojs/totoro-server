![totoro](https://f.cloud.github.com/assets/340282/891339/657d9018-fa54-11e2-9760-6955388fd8fc.jpg)

# totoro-server

Server side of totoro.

Latest stable version：v0.4.0

---

## 1. Installation

### Node requirement

\>= 0.10.12

### Install from npm

```
$ npm install totoro-server -g
```

If it not works, you may add `sudo` before the command, as follows.

### Install from github

To get the latest function (may not be stable)

```
$ git clone git@github.com:totorojs/totoro-server.git
$ cd totoro-server
$ npm install -g
```

## 2. Quick Start

```
$ totoro-server --verbose
```

Use any browser to visit {{yourIP}}:9999, then this browser could be used to test.

### Important: you need to change browser setting to allow popup window !

Refer to [popup settings](https://github.com/totorojs/totoro-server/wiki/Popup-Settings.zh)

## 3. Cli Options

#### --server-host

Server host。

Default: IP of this computer.

#### --server-port

Server port。

Default: 9999

#### --insert-scripts

Specify a comman-delimited list of scripts to insert into page {{--server-host}}:{{--server-port}}.

Default: none

#### --verbose

Show more info.

Default: false

## 4. Config File

If you need a config file, just place `totoro-srever-config.json` in the CWD, all options are written in lower camel case.

![totoro](https://f.cloud.github.com/assets/340282/891339/657d9018-fa54-11e2-9760-6955388fd8fc.jpg)

# totoro-server

Server side of totoro.

Latest stable version：v0.5.x

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

1. Launch server.

    ```
    $ totoro-server
    ```
    
    You should see a log like bellow:
    
    ```
    info 2014-03-03 12:16:39 index.js:66 | Start server <{{yourIP}}:9999>
    ```

2. Use any browser to visit {{yourIP}}:9999, then it could be used to test.

3. Allowing popup setting, make sure browser won't block popup from {{yourIP}}.

    Refer to [popup settings](https://github.com/totorojs/totoro-server/wiki/Popup-Settings.zh).

Want to run some test? See the [quick start of totoro](https://github.com/totorojs/totoro#totoro).

## 3. Cli Options

#### -H, --host

Server host。

Default: IP of this computer.

#### -P, --port

Server port。

Default: 9999

#### -d, --debug

Show debug log.

Default: false

## 4. Config File

If you need a config file, just place `totoro-srever-config.json` in the CWD, all options are written in lower camel case.

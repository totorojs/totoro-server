![totoro](https://f.cloud.github.com/assets/340282/891339/657d9018-fa54-11e2-9760-6955388fd8fc.jpg)

# totoro-server

Server side of totoro.

Latest stable version：v1.0.1

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

    You should see an output like bellow:

    ```
    Start server <{{yourIP}}:9999>
    ```

2. Start a driver

    Use any browser to visit {{yourIP}}:9999, then it registers as a **web driver** that can drive the browser of this kind run test.

    If you use it on pc, be mind that allow popup from {{yourIP}}, refer to [popup settings](https://github.com/totorojs/totoro-server/wiki/Popup-Settings.zh).

Want to run some test? See the [quick start of totoro](https://github.com/totorojs/totoro#totoro).


## 3. What Is A Driver?

In a word, a driver is something open specified browser to visit specified URL and close it by directives from server.

### Existing drivers

- web driver

    Any browser opens {{yourIP}}:9999 becomes a web driver, it's for temporary use only.

- [totoro-driver](https://github.com/totorojs/totoro-driver)

    A stable driver written in node, be able to drive chrome, safari, firefox and ie both on windows and mac.

### How to write a driver?

If you know how to open and close a browser, it's very very easy to write a driver for it.

All steps with pseudo-code.

1. Set command line options

    - `-s, --server`: default is `server.totorojs.org:9999`
    - `-b, --browsers`: specifies browser names you want to drive, split by comma

2. Use socket to link to server and init.

    ```
    var socket = socketClient.connect({{server}} + '/__labor')

    socket.on('connect', function() {
      var ua = {
        device: { name: 'mac' },
        os: { name: 'macosx', version: '13.1.0' },
        browser: { name: 'chrome', version:'35.0.1916.114' }
      }

      socket.emit('init', ua)
    })
    ```

3. Open or close specified browser when received corresponding directives.

    ```
    socket.on('add', function(data) {
      /*
       * structure of data
       * {
       *   orderId: '{{orderId}}',
       *   laborId: '{{laborId}}',
       *   ua: {{specifed browser ua}},
       *   url: {{test runner url}}
       * }
       */
      var key = data.orderId + '-' + data.laborId
      orders[key] = open(url)
    })

    socket.on('remove', function(data) {
      // the structure is the same as 'add' event's but without the ua
      var key = data.orderId + '-' + data.laborId
      close(orders[key])
      ;delete orders[key]
    })
    ```

4. Close all browsers when dirver exits.


# 4. Cli Options

#### -H, --host

Server host。

Default: IP of this computer.

#### -P, --port

Server port。

Default: 9999

#### -d, --debug

Show debug log.

Default: false

## 5. Config File

If you need a config file, just place `totoro-srever-config.json` in the CWD, all options are written in lower camel case.

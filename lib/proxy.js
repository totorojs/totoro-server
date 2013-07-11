'use strict';

var when = require('when')
var path = require('path')
var iconv = require('iconv-lite')
var jscoverage = require('jscoverage')

var logger = require('./logger')
var adapt = require('./adapt')
var manager = require('./manager')


module.exports = Proxy


// private
function Proxy(id) {
    var self = this
    var order = this.order = manager.orders[id]
    var runner = order.parsedRunner.path
    var protocol = order.parsedRunner.protocol

    this.protocol = protocol.slice(0, protocol.indexOf(':'))
    this.socket = order.socket
    this.cache = {}

    this.order.on('destroy', function() {
        delete Proxy.caches[id]
    })

    this.useSocket = when.defer()
    this.getRequestType(runner, function(useSocket) {
        logger.debug('order: ' + id + ' use socket proxy: ' + useSocket)
        if (useSocket) {
            self.socket.on('proxyRes', function(info) {
                /*
                 * NOTE
                 * the buffer through the socket transmission,
                 * is transformed into a character array
                 */
                info.body = new Buffer(info.body)
                self.requestCb(info.path, info)
            })
        }

        self.useSocket.resolve(useSocket)
    })

    logger.debug('init proxy of order: ' + id)
}


var runnerReg = /\/runner\/([^/]+)(\/.*)/

// the only public method
Proxy.proxy = function(req, res) {
    var match = req.url.match(runnerReg)
    var id = match[1]
    var p = match[2]

    Proxy.getProxy(id).getData(p, req, res)
}

Proxy.getProxy = function(id) {
    var caches = Proxy.caches
    return caches[id] || (caches[id] = new Proxy(id))
}

Proxy.caches = {/*
     orderId: proxyInstance
*/}


Proxy.prototype.getRequestType = function(p, cb){
    var opts = this.getOpts(p, 'head')

    require(this.protocol).request(opts, function(res) {
        // NOTE don't delete this empty listener, or request() will not work
        res.on('data', function(data) {})

        res.on('end', function() {
            var statusCode = res.statusCode
            var useSocket = statusCode < 200 || 399 < statusCode ? true : false
            cb(useSocket)
        })
    }).on('error', function(err) {
        cb(true)
    }).end()
}

Proxy.prototype.getData = function(p, req, res) {
    var self = this
    var cache = this.cache

    if (!cache[p]) {
        cache[p] = when.defer()

        when(this.useSocket.promise, function(useSocket) {
            self.request(p, req, useSocket)
        })
    }

    cache[p].promise.then(function(info) {
        info.headers['content-length'] = info.body.length
        res.writeHead(info.statusCode, info.headers)
        res.write(new Buffer(info.body))
        res.end()
    })
}

Proxy.prototype.request = function(p, req, useSocket) {
    /*
     * NOTE
     * delete host to avoid request original url
     * delete accept-encoding to avoid server gzip
     */
    delete req.headers['host']
    ;delete req.headers['accept-encoding']

    if (useSocket) {
        this.socket.emit('proxyReq', {
            path: p,
            headers: req.headers
        })
    } else {
        this.defaultRequest(p, req)
    }
}

// http(s) proxy
Proxy.prototype.defaultRequest = function(p, req) {
    var self = this

    var opts = this.getOpts(p)
        opts.headers = req.headers

    require(this.protocol).request(opts, function(res) {
        var buffer = new Buffer(parseInt(res.headers['content-length'], 10))
        var offset = 0

        res.on('data', function(data) {
            data.copy(buffer, offset)
            offset += data.length
        })

        res.on('end', function() {
            self.requestCb(p, {
                statusCode: res.statusCode,
                headers: res.headers,
                body: buffer
            })
        })

    }).on('error', function(err) {
        logger.warn('proxy request error: ' + err)
        self.requestCb(p, {
            statusCode: 500,
            body: err
        })
    }).end()
}

// common proxy request callback
Proxy.prototype.requestCb = function(p, info) {
    var self = this
    this.decorate(p, info, function(info) {
        self.cache[p].resolve(info)
    })
    logger.debug('request: ' + p + ' of order: ' + this.order.id
            + ' \'s status: ' + info.statusCode)
}


// process proxy return, such as adapt runner, insert cov code, etc
Proxy.prototype.decorate = function(p, info, cb) {
    var order = this.order
    var buffer = info.body
    var charset
    var str

    if (order.parsedRunner.path === p) {
        logger.debug('adapt runner: ' + p)
        charset = order.charset || detectCharset(buffer)
        str = iconv.decode(buffer, charset)

        adapt(str, order.adapter, function(err, str) {
            if (err) {
                order.report({
                    action: 'log',
                    info: {
                        type: 'error',
                        message: err
                    }
                })
            }

            info.body = iconv.encode(str, charset)
            cb(info)
        })
    } else if (p.indexOf('src/') !== -1 && path.extname(p) === '.js') {
        logger.debug('insert cov code: ' + p)
        charset = order.charset || detectCharset(buffer)
        str = iconv.decode(buffer, charset)

        str = jscoverage.process(p, str)

        info.body = iconv.encode(str, charset)
        cb(info)
    } else {
        cb(info)
    }
}

Proxy.prototype.getOpts = function(p, method) {
    var order = this.order
    var parsedRunner = order.parsedRunner

    return {
        hostname: parsedRunner.hostname,
        port: parsedRunner.port,
        path: p,
        method: method || 'get'
    }
}


var charsetReg = /charset\s*=\s*['"]([-\w]+)\s*['"]/
function detectCharset(buf) {
    var str = iconv.decode(buf).slice(0, 1000)
    var matcher = str.match(charsetReg)

    if (matcher) return matcher[1]
    return 'utf-8'
}


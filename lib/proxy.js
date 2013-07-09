'use strict';

var http = require('http')
var when = require('when')
var iconv = require('iconv-lite')
var jscoverage = require('jscoverage')

var logger = require('./logger')
var adapt = require('./adapt')
var manager = require('./manager')

var caches = {/*
     orderId: {path: cache}
*/}

var sockets = {/*
    orderId: socket
*/}

var socket

module.exports = proxy


var runnerReg = /\/runner\/([^/]+)(\/.*)/

function Socket(order) {
    this.socket = order.socket
    this.id = order.id
    var cache = caches[order.id]
    this.socket.on('proxyData', function(info) {
        decorateRes(order, info.path, info, function(info) {
            cache[info.path].resolve(info)
        })
    })
}

Socket.getSocket = function(order) {
    return sockets[order.id] || (sockets[order.id] = new Socket(order))
}

Socket.prototype = {
    request: function(opts) {
        this.socket.emit('getInfo', {
            id: this.id,
            path: opts.path,
            headers: opts.headers
        })
    }
}

function proxy(req, res) {

    // TODO 需要一个检查条件，确定什么情况下启用 socket
    var match = req.url.match(runnerReg)
    var id = match[1]
    var p = match[2]
    var order = manager.orders[id]
    var parsedRunner = order.parsedRunner

    // first request of a order
    // this order may has several concerned path
    // include runner, js, css path, and so on
    if (!caches[id]) {
        // logger.debug('first request: ' + p + ' of order: ' + id)
        caches[id] = {}

        order.on('destroy', function() {
            delete caches[id]
        })
    }

    // first request of a path
    // create a promise of the path
    if (!caches[id][p]) {
        // logger.debug('first request of path: ' + p)
        var deferred = when.defer()
        caches[id][p] = deferred

        request(order, p, req)
    }

    // now, it is sure that the promise existed
    caches[id][p].promise.then(function(info) {
        info.headers['content-length'] = info.body.length
        res.writeHead(info.statusCode, info.headers)
        res.write(new Buffer(info.body))
        res.end()
    })
}


function request(order, p, req) {
    /*
     * NOTE
     * delete host to avoid request original url
     * delete accept-encoding to avoid server gzip
     */
    delete req.headers['host']
    ;delete req.headers['accept-encoding']

    var parsedRunner = order.parsedRunner

    var opts = {
        hostname: parsedRunner.hostname,
        port: parsedRunner.port,
        path: p,
        headers: req.headers,
    }

    socket = Socket.getSocket(order)
    socket.request(opts)
}


// 解析请求的文件. 这个文件的来源可能有多个地方.
function decorateRes(order, p, info, cb) {
    var charset, str

    // 因为 buffer 在通过 socket 传输后，被转变成了字符数组
    var buffer = info.body = new Buffer(info.body)
    if (order.isRunner(p)) {
        logger.debug('handle adapter of runner: ' + p)
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

            var adaptedBuffer = iconv.encode(str, charset)
            info.body = adaptedBuffer
            cb(info)
        })
    } else if (p.indexOf('src/') !== -1) {
        logger.debug('handle coverage of src: ' + p)
        charset = order.charset || detectCharset(buffer)
        str = iconv.decode(buffer, charset)

        str = jscoverage.process(p, str)

        var adaptedBuffer = iconv.encode(str, charset)
        info.body = adaptedBuffer
        cb(info)
    } else {
        cb(info)
    }
}


var charsetReg = /charset\s*=\s*['"]([-\w]+)\s*['"]/
function detectCharset(buf) {
    var str = iconv.decode(buf).slice(0, 1000)
    var matcher = str.match(charsetReg)

    if (matcher) return matcher[1]
    return 'utf-8'
}

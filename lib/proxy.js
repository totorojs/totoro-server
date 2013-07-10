'use strict';

var http = require('http')
var when = require('when')
var path = require('path')
var iconv = require('iconv-lite')
var jscoverage = require('jscoverage')

var logger = require('./logger')
var adapt = require('./adapt')
var manager = require('./manager')

var caches = {/*
     orderId: {
         isSocketProxy: false,
         path: cache
     }
*/}

var sockets = {/*
    orderId: socket
*/}

var socket

module.exports = proxy


function Socket(order) {
    this.socket = order.socket
    this.id = order.id
    var cache = caches[order.id]
    this.socket.on('proxyData', function(info) {
        /*
         * NOTE
         * Because the buffer through the socket transmission,
         * is transformed into a character array
         */
        info.body = new Buffer(info.body)

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

var runnerReg = /\/runner\/([^/]+)(\/.*)/

function proxy(req, res) {
    var match = req.url.match(runnerReg)
    var id = match[1]
    var p = match[2]

    // first request of an order, it must be the runner
    if (!caches[id]) {
        caches[id] = {}
        manager.orders[id].on('destroy', function() {
            delete caches[id]
        })
        getProxyType(req, res, promise)
    } else {
        promise(req, res)
    }
}


function getProxyType(req, res, cb){
    var match = req.url.match(runnerReg)
    var id = match[1]
    var p = match[2]
    caches[id].isSocketProxy = true
    logger.debug('order: ' + id + ' \'s proxy type is: ' + 'socket')
    cb(req, res)
}


function promise(req, res) {
    var match = req.url.match(runnerReg)
    var id = match[1]
    var p = match[2]
    var cache = caches[id]

    // first request of a path
    if (!cache[p]) {
        var deferred = when.defer()
        cache[p] = deferred

        request(manager.orders[id], p, req)
    }

    // now, it is sure that the promise existed
    cache[p].promise.then(function(info) {
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


function decorateRes(order, p, info, cb) {
    var charset, str
    var buffer = info.body

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
            } else if (p.indexOf('src/') !== -1 && path.extname(p) === '.js') {
                logger.debug('handle coverage of src: ' + p)
                charset = order.charset || detectCharset(buffer)
                str = iconv.decode(buffer, charset)

                str = jscoverage.process(p, str)

                var adaptedBuffer = iconv.encode(str, charset)
                info.body = adaptedBuffer
                res.headers['content-length'] = adaptedBuffer.length
                cb(info)
            } else {
                cb(info)
            }

            var adaptedBuffer = iconv.encode(str, charset)
            info.body = adaptedBuffer
            cb(info)
        })
    } else if (p.indexOf('src/') !== -1 && path.extname(p) === '.js') {
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

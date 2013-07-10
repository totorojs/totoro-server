'use strict';

var when = require('when')
var path = require('path')
var iconv = require('iconv-lite')
var jscoverage = require('jscoverage')

var logger = require('./logger')
var adapt = require('./adapt')
var manager = require('./manager')

var runnerReg = /\/runner\/([^/]+)(\/.*)/
var caches = {/*
     orderId: {
         isSocketProxy: false,
         path: cache
     }
*/}


module.exports = proxy


function proxy(req, res) {
    var match = req.url.match(runnerReg)
    var id = match[1]
    var p = match[2]
    var order = manager.orders[id]

    // first request of an order, it must be the runner
    if (!caches[id]) {
        caches[id] = {}
        order.on('destroy', function() {
            delete caches[id]
        })

        getProxyType(id, p, req, res, function(id, p, req, res) {
            // if this order use socket proxy, add listener first
            if (caches[id].isSocketProxy) {
                addSocketProxyListener(id)
            }

            defer(id, p, req, res)
        })
    } else {
        defer(id, p, req, res)
    }
}


function getProxyType(id, p, req, res, cb){
    var v = false
    caches[id].isSocketProxy = v
    logger.debug('order: ' + id + ' \'s proxy type is: ' + (v ? 'socket' : 'http(s)'))
    cb(id, p, req, res)
}


function addSocketProxyListener(id) {
    manager.orders[id].socket.on('proxyData', function(info) {
        /*
         * NOTE
         * the buffer through the socket transmission,
         * is transformed into a character array
         */
        info.body = new Buffer(info.body)

        requestCb(id, info.path, info)
    })
}


function defer(id, p, req, res) {
    var cache = caches[id]

    // first request of a path
    if (!cache[p]) {
        cache[p] = when.defer()

        /*
         * NOTE
         * delete host to avoid request original url
         * delete accept-encoding to avoid server gzip
         */
        ;delete req.headers['host']
        ;delete req.headers['accept-encoding']

        if (cache.isSocketProxy) {
            manager.orders[id].socket.emit('getInfo', {
                id: id,
                path: p,
                headers: req.headers
            })
        } else {
            request(id, p, req)
        }
    }

    // now, it is sure that the deferred existed
    cache[p].promise.then(function(info) {
        info.headers['content-length'] = info.body.length
        res.writeHead(info.statusCode, info.headers)
        res.write(new Buffer(info.body))
        res.end()
    })
}


function request(id, p, req) {
    var order = manager.orders[id]
    var parsedRunner = order.parsedRunner
    var protocol = parsedRunner.protocol
        protocol = protocol.slice(0, protocol.indexOf(':'))

    var opts = {
        hostname: parsedRunner.hostname,
        port: parsedRunner.port,
        path: p,
        headers: req.headers,
    }

    require(protocol).request(opts, function(res) {
        var buffer = new Buffer(parseInt(res.headers['content-length'], 10))
        var offset = 0

        res.on('data', function(data) {
            data.copy(buffer, offset)
            offset += data.length
        })

        res.on('end', function() {
            requestCb(id, p, {
                statusCode: res.statusCode,
                headers: res.headers,
                body: buffer
            })
        })

    }).on('error', function(err) {
        logger.warn('proxy request error: ' + err)
        requestCb(id, p, {
            statusCode: 500,
            body: err
        })
    }).end()

}


function requestCb(id, p, info) {
    decorate(id, p, info, function(info) {
        caches[id][p].resolve(info)
    })
}


function decorate(id, p, info, cb) {
    var order = manager.orders[id]
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
        logger.debug('add cov to src: ' + p)
        charset = order.charset || detectCharset(buffer)
        str = iconv.decode(buffer, charset)

        str = jscoverage.process(p, str)

        info.body = iconv.encode(str, charset)
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

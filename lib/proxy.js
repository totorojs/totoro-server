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


module.exports = proxy


var runnerReg = /\/runner\/([^/]+)(\/.*)/

function proxy(req, res) {
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
        caches[id][p] = deferred.promise

        request(order, p, req, function(info) {
            deferred.resolve(info)
        })
    }

    // now, it is sure that the promise existed
    caches[id][p].then(function(info) {
        res.writeHead(info.statusCode, info.headers)
        res.write(info.body)
        res.end()
    })
}


function request(order, p, req, cb) {
    /*
     * NOTE
     * delete host to avoid request original url
     * delete accept-encoding to avoid server gzip
     */
    delete req.headers['host']
    ;delete req.headers['accept-encoding']

    var parsedRunner = order.parsedRunner
    var protocol = parsedRunner.protocol
        protocol = protocol.slice(0, protocol.indexOf(':'))
    var opts = {
        hostname: parsedRunner.hostname,
        port: parsedRunner.port,
        path: p,
        headers: req.headers
    }

    require(protocol).request(opts, function(res) {
        var buffer = new Buffer(parseInt(res.headers['content-length'], 10))
        var offset = 0

        res.on('data', function(data) {
            data.copy(buffer, offset)
            offset += data.length
        })

        res.on('end', function() {
            var info = {
                statusCode: res.statusCode,
                headers: res.headers,
                body: buffer
            }

            var charset, str

            if (p === parsedRunner.path) {
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
                    res.headers['content-length'] = adaptedBuffer.length
                    cb(info)
                })
            } else if (p.indexOf('src/') !== -1) {
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
        })
    }).on('error', function(err) {
        logger.warn('proxy resource error: ' + err)
        cb({
            statusCode: 500,
            body: err
        })
    }).end()
}


var charsetReg = /charset\s*=\s*['"]([-\w]+)\s*['"]/
function detectCharset(buf) {
    var str = iconv.decode(buf).slice(0, 1000)
    var matcher = str.match(charsetReg)

    if (matcher) return matcher[1]
    return 'utf-8'
}

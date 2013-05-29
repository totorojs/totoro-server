'use strict';

var http = require('http')
var when = require('when')
var iconv = require('iconv-lite')

var logger = require('./logger')
var adapt = require('./adapt')
var manager = require('./manager')

var caches = {/*
     orderId: {path: cache}
*/}


module.exports = proxy


function proxy(req, res) {
    var match = req.path.match(/\/runner\/([^/]+)(\/.*)/)
    var id = match[1]
    var p = match[2]
    var order = manager.orders[id]
    var parsedRunner = order.parsedRunner

    // first request of a order
    // this order may has several concerned path (include runner path)
    if (!caches[id]) {
        logger.debug('first request: ' + p + ' of order: ' + id)
        caches[id] = {}

        order.on('destroy', function() {
            delete caches[id]
        })
    }

    // first request of a path
    // create a promise of the path
    if (!caches[id][p]) {
        logger.debug('first request of path: ' + p)
        var deferred = when.defer()
        caches[id][p] = deferred.promise

        var options = {
            hostname: parsedRunner.hostname,
            port: parsedRunner.port,
            path: p,
            headers: req.headers
        }
        ;delete req.headers['host']
        ;delete req.headers['accept-encoding']

        var protocol = parsedRunner.protocol
        protocol = protocol.slice(0, protocol.indexOf(':'))
        require(protocol).request(options, function(res2) {
            var buffer = new Buffer(parseInt(res2.headers['content-length'], 10))
            var offset = 0

            res2.on('data', function(data) {
                data.copy(buffer, offset)
                offset += data.length
            })

            res2.on('end', function() {
                var cacheInfo = {
                    path: p,
                    statusCode: res2.statusCode,
                    headers: res2.headers,
                    data: buffer
                }

                if (parsedRunner.path.indexOf(p) > -1) {
                    logger.debug('handle adapter of runner: ' + p)
                    var charset = detectCharset(buffer, order.charset)
                    var str = iconv.decode(buffer, charset)

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
                        cacheInfo.data = adaptedBuffer
                        res2.headers['content-length'] = adaptedBuffer.length
                        deferred.resolve(cacheInfo)
                    })
                } else {
                    deferred.resolve(cacheInfo)
                }
            })
        }).on('error', function(err) {
            logger.warn('proxy resource error: ' + err)
            deferred.resolve({
                statusCode: 500,
                data: err
            })
        }).end()
    }

    // now, it is sure that the promise existed
    caches[id][p].then(function(content) {
        res.writeHead(content.statusCode, content.headers)
        res.write(content.data)
        res.end()
    })
}


var charsetReg = /charset\s*=\s*['"]([-\w]+)\s*['"]/
function detectCharset(buf, charset) {
    if (charset) return charset

    var str = iconv.decode(buf).slice(0, 1000)
    var matcher = str.match(charsetReg)

    if (matcher) return matcher[1]
    return 'utf-8'
}

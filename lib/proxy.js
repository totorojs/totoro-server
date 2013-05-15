'use strict';

var http = require('http')
var when = require('when')
var iconv = require('iconv-lite')

var logger = require('../logger')
var adapt = require('./adapt')

exports.getContent = function(server, req, callback) {

    var match = req.path.match(/runner\/([^/]+)\/(.*)/)
    var id = match[1]
    var p = match[2]

    var all = Cache.all
    var order = server.orderManager.get(id)
    var runner = order.runner
    var cache = all[id] || (all[id] = new Cache(order))

    if (p.indexOf('/') !== 0) {
        p = '/' + p
    }

    var pathCache = cache.find(p)

    if (pathCache) {
        pathCache.then(callback)
        return
    }

    pathCache = cache.addDefer(p);
    pathCache.then(callback)

    var options = {
        host: order.host,
        port: order.port,
        path: p,
        headers: req.headers
    }
    ;delete req.headers['host']
    ;delete req.headers['accept-encoding']
    //console.info('options---->', options)
    var request = require(order.protocol).request(options, function(res) {
        var buffer = new Buffer(parseInt(res.headers['content-length'], 10))
        var offset = 0

        res.on('data', function(data) {
            data.copy(buffer, offset)
            offset += data.length
        })

        res.on('end', function() {
            if (runner.indexOf(p) > -1) {
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

                    // TODO 错误是否继续处理?
                    str = str || ''
                    buffer = iconv.encode(str, charset)
                    res.headers['content-length'] = buffer.length
                    cache.add(p, res.statusCode, res.headers, buffer)
                })
            } else {
                cache.add(p, res.statusCode, res.headers, buffer)
            }
            //callback(null, _cache)
        })
    }).on('error', function(e) {
        logger.warn('cache resource error: ' + e)
        callback({
            statusCode: 500,
            data: e
        })
    })
    request.end()
}


function Cache(order) {
    this.caches = {}
    order.on('destroy', function() {
        /**
        var caches = Cache.all[order.id].caches
        _.keys(caches).forEach(function(c) {
            delete caches[c].data
        })
        **/

        delete Cache.all[order.id]
    })
}

Cache.all = {}

Cache.prototype.add = function(p, statusCode, headers, data) {
    var info = {
        path: p,
        statusCode: statusCode,
        headers: headers,
        data: data
    }

    this.caches[p].resolve(info)
    this.caches[p]._cache = info
}

Cache.prototype.addDefer = function(p) {
    return (this.caches[p] = when.defer()).promise
}

Cache.prototype.find = function(p) {
    var path
    for (var i in this.caches) {
        if (i === p){
            path = i
            break
        }
    }
    return path && this.caches[path].promise
}

var charsetReg = /charset\s*=\s*['"]([-\w]+)\s*['"]/
function detectCharset(buf, charset) {
    if (charset) return charset

    var str = iconv.decode(buf).slice(0, 1000)
    var matcher = str.match(charsetReg)

    if (matcher) return matcher[1]
    return 'utf-8'
}

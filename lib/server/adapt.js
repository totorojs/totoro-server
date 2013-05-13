'use strict';

var path = require('path')
var fs = require('fs')
var http = require('http')

var logger = require('../logger')
var utils = require('../utils')


module.exports = adapt

var availableAdapters = module.exports.availableAdapters = ['mocha', 'jasmine']

function adapt(content, order, callback) {
    var adapter = order.adapter

    if (utils.isAbsolute(adapter) || availableAdapters.indexOf(adapter) > -1) {
        var match = content.match(/<\/head>/)
        if (match) {
            addAdapter(content, adapter, match.index, callback)
        } else {
            order.report({
                action: 'error',
                message: 'can not add adapter ' + adapter
            })
        }
    } else {
        var scriptPattern = /<script.*?>.*?<\/script>/ig
        var adapterPattern = new RegExp(availableAdapters.join('|'), 'ig')
        var result
        var i

        while ((i = scriptPattern.exec(content)) !== null) {
            var j = adapterPattern.exec(i[0])
            if (j) {
                result = {
                    adapter: j[0],
                    script: i[0],
                    insertPos: i.index + i[0].length
                }
                logger.debug('found adapter "' + j[0] + '"')
                break
            }
        }
        if (result) {
            addAdapter(content, result.adapter, result.insertPos, callback)
        } else {
            var errMsg = 'can not guess which adapter should be used, "' +
                availableAdapters +
                '" default suported, you should use them through script tag wihout name modification.'

            order.report({
                action: 'error',
                message: errMsg
            })
        }
    }
}

function addAdapter(content, adapterPath, position, callback) {
    var staticPath = path.join(__dirname, '..', '..', 'static')
    var onerrorPath = path.join(staticPath, 'adapters', 'onerror.js')
    var onerrorContent = fs.readFileSync(onerrorPath)

    parseAdapter(adapterPath, function(adapter) {
        var new_content = content.substring(0, position) +
            '<script>' + onerrorContent + '</script>' +
            '<script>' + adapter + '</script>' +
            content.substring(position)
        callback(new_content)
   })
}

function parseAdapter(adapterPath, callback) {
    var staticPath = path.join(__dirname, '..', '..', 'static')
    var adapterContent

    if (!utils.isAbsolute(adapterPath)) {
        adapterPath = path.join(staticPath, 'adapters', adapterPath + '.js' )
        adapterContent = fs.readFileSync(adapterPath)
        callback(adapterContent)
    } else {
        http.get(adapterPath, function(res) {
            var data = ''
            res.on('data', function(chunk) {
               data += chunk
            })

            res.on('end', function() {
               callback(data)
            })
       })
    }
}

'use strict';

var path = require('path')
var fs = require('fs')
var http = require('http')
var request = require('request')
var common = require('totoro-common')
var logger = common.logger

var availableAdapters = module.exports.availableAdapters = ['mocha', 'jasmine']


module.exports = adapt


function adapt(content, adapter, callback) {

    if (common.isUrl(adapter) || availableAdapters.indexOf(adapter) > -1) {
        var match = content.match(/<\/head>/)
        if (match) {
            addAdapter(content, adapter, match.index, callback)
        } else {
            callback('Valid runner.html and can not add adapter ' + adapter)
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

            callback(errMsg)
        }
    }
}

function addAdapter(content, adapterPath, position, callback) {
    var staticPath = path.join(__dirname, '..', 'static')
    var onerrorPath = path.join(staticPath, 'adapters', 'onerror.js')
    var onerrorContent = fs.readFileSync(onerrorPath)

    parseAdapter(adapterPath, function(err, adapter) {
        if (err) {
            callback(err)
        } else {
            var new_content = content.substring(0, position) +
                '<script>' + onerrorContent + '</script>' +
                '<script>' + adapter + '</script>' +
                content.substring(position)
            callback(null, new_content)
        }
   })
}

function parseAdapter(adapter, callback) {
    var staticPath = path.join(__dirname, '..', 'static')
    var adapterContent

    if (isKeyword(adapter)) {
        adapter = path.join(staticPath, 'adapters', adapter + '.js' )
        adapterContent = fs.readFileSync(adapter)
        callback(null, adapterContent)
    } else {
        getUrl(adapter, function(err, body) {
            if (err) {
                callback('Not found adapter ' + adapter)
            } else {
                callback(null, body)
            }
        })
    }
}

function isKeyword(p) {
    return p.indexOf('.') === -1 && p.indexOf(path.sep) === -1
}

function getUrl(url, callback) {
    request(url, function(err, res, body) {
        if (err) {
            logger.warn('fetch url ' + url + ' error!')
        }
        callback(err, body || '')
    })
}


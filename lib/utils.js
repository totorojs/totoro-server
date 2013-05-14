'use strict';

var fs = require('fs')
var colorful = require('colorful')
var request = require('request')
var logger = require('./logger')

exports.getExternalIpAddress = function() {
    var interfaces = require('os').networkInterfaces()
    var addresses = []
    Object.keys(interfaces).forEach(function(name) {
        var iface = interfaces[name]
        for (var i in iface) {
            var node = iface[i]
            if (node.family === 'IPv4' && node.internal === false) {
                addresses = addresses.concat(node)
            }
        }
    })
    if (addresses.length > 0) {
        return addresses[0].address
    }
}

exports.mix = function(target, src, ow) {
    target = target || {}
    for (var i in src) {
        if (ow || typeof target[i] === 'undefined') {
            target[i] = src[i]
        }
    }
    return target
}

exports.print = print
exports.println = println

function print(str, color) {
    str = str || ''
    str = color ? colorful[color](str) : str
    process.stdout.write(str)
}

function println(str, color) {
    print(str, color)
    process.stdout.write('\n')
}

var urlReg = /^https?:\/\//
exports.isUrl = function(url) {
    return urlReg.test(url)
}

exports.getUrl = function(url, callback) {
    request(url, function(err, res, body) {
        if (err) {
            logger.warn('fetch url ' + url + ' error!')
        }
        callback(err, body || '')
    })
}

exports.isExistedFile = function(p) {
    return p && fs.existsSync(p) && fs.statSync(p).isFile()
}


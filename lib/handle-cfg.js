'use strict';

var path = require('path')
var fs = require('fs')

var logger = require('./logger')
var utils = require('./utils')

var defaultCfg = {
    serverHost : getExternalIpAddress(),
    serverPort : '9999',
    insertScripts: []
}

module.exports = handleCfg

function handleCfg(cfg) {
    var projectCfg = readCfgFile('totoro-config.json')
    return mix(cfg, projectCfg, defaultCfg)
}

function readCfgFile(p) {
    try {
        return JSON.parse(fs.readFileSync(p) + '')
    } catch(e) {
        logger.debug('fail to read config file: ' + p)
        return
    }
}

function mix(target, src, ow) {
    target = target || {}
    var len = arguments.length
    var srcEnd = len - 1
    var lastArg = arguments[len - 1]

    if ( typeof lastArg === 'boolean' || typeof lastArg === 'number') {
        ow = lastArg
        srcEnd--
    } else {
        ow = false
    }

    for (var i = 1; i <= srcEnd; i++) {
        var current = arguments[i] || {}
        for (var j in current) {
            if (ow || typeof target[j] === 'undefined') {
                target[j] = current[j]
            }
        }
    }

    return target
}

function getExternalIpAddress() {
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

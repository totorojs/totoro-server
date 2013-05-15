'use strict';

var path = require('path')
var fs = require('fs')

var logger = require('./logger')
var utils = require('./utils')


var ip = utils.getExternalIpAddress()

var defaultCfg = {
    serverHost : ip,
    serverPort : '9999',
    insertScripts: []
}

// parse config
var projectCfg = getCfg(path.join(process.cwd(), 'totoro-config.json'))


exports.handleCfg = function(cfg) {
    return mix(cfg, projectCfg, defaultCfg)
}

function getCfg(cfgPath) {
    var cfg = null
    if (!fs.existsSync(cfgPath)) {
        return {}
    }

    try {
        cfg = JSON.parse(fs.readFileSync(cfgPath) + '')
    } catch(e) {
        logger.warn('parse config error! (' + cfgPath + ')')
    }
    return cfg || {}
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


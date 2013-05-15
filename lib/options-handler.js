'use strict';

var path = require('path')
var fs = require('fs')

var logger = require('./logger')
var utils = require('./utils')


var ip = utils.getExternalIpAddress()

var serverCfg = {
    serverHost : ip,
    serverPort : '9999',
    insertScripts: []
}

// parse config
var projectCfg = getCfg(path.join(process.cwd(), 'totoro-config.json'))

utils.mix(serverCfg, projectCfg, true)

exports.getServerCfg = function(commander) {
    mixCommander(serverCfg, commander)
    return serverCfg
}


function mixCommander(cfg, commander) {
    Object.keys(cfg).forEach(function(key) {
        if (commander[key]) {
            cfg[key] = commander[key]
        }
    })
    return cfg
}

function getCfg(cfgPath) {
    var cfg = null
    if (!fs.existsSync(cfgPath)) {
        return {}
    }

    cfg = fs.readFileSync(cfgPath) + ''

    if (!cfg) {
        return {}
    }

    try {
        cfg = JSON.parse(fs.readFileSync(cfgPath))
    } catch(e) {
        logger.warn('parse config error! (' + cfgPath + ')')
    }
    return cfg || {}
}

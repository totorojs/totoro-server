'use strict';

var path = require('path')
var fs = require('fs')

var common = require('totoro-common')

var defaultCfg = {
    serverHost : common.getExternalIpAddress(),
    serverPort : 9999,
    insertScripts: []
}

module.exports = handleCfg

function handleCfg(cfg) {
    var projectCfg = common.readCfgFile('totoro-config.json')
    return common.mix(cfg, projectCfg, defaultCfg)
}

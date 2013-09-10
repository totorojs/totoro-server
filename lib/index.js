'use strict';

var inherits = require('util').inherits
var express = require('express')
var path = require('path')
var fs = require('fs')
var async = require('async')
var common = require('totoro-common')
var logger = require('./logger')

var manager = require('./manager')
var Proxy = require('./proxy')


module.exports = Server


var defaultCfg = {
    serverHost: common.getExternalIpAddress(),
    serverPort: 9999,
    insertScripts: []
}

function Server(cfg) {
    var projectCfg = common.readCfgFile('totoro-server-config.json')
    this.cfg = common.mix(cfg, projectCfg, defaultCfg)
    this.launchServer()
}

Server.prototype.launchServer = function() {
    var cfg = this.cfg
    var app = this.app = express()
    var server = require('http').createServer(app)
    var io = this.io = require('socket.io').listen(server, {
        log: false
    })

    io.set('transports', [
        'websocket',
        'flashsocket',
        'htmlfile',
        'xhr-polling',
        'jsonp-polling'
    ])

    // labor register
    var staticPath = path.join(__dirname, '..', 'static')
    var captureContent
    app.get('/', function(req, res) {
        if (!captureContent) {
            captureContent = fs.readFileSync(path.join(staticPath, 'labor.html')).toString()
            captureContent = insertScripts(captureContent, cfg.insertScripts)
        }
        res.send(captureContent)
    })

    // runner proxy
    app.get('/runner/*', function(req, res) {
        Proxy.proxy(req, res)
    })

    app.get('/list', function(req, res) {
        res.send(manager.list())
    })

    app.use(express.static(staticPath))

    server.listen(cfg.serverPort, cfg.serverHost, function(socket) {
        logger.info('Start server', '<' + cfg.serverHost + ':' + cfg.serverPort + '>')
    })

    // labor socket
    io.of('/labor').on('connection', function(socket) {
        socket.on('init', function(data) {
            manager.addLabor(socket, data)
        })
    })

    var serverVersion = require('../package.json').version
    var serverMainVersion = mainVersion(serverVersion)

    // client socket
    io.of('/order').on('connection', function(socket) {
        socket.on('init', function(data) {
            var clientVersion = data.version

            if (serverMainVersion !== mainVersion(clientVersion)) {
                socket.emit('report', [{
                    action: 'error',
                    info: ['Client version mismatch! ' +
                            'Please install version ' +
                            serverMainVersion + '.*']
                }])
                return
            }

            delete data.version
            manager.addOrder(socket, data)
        })
    })
}


// insert specified scripts into labor.html
function insertScripts(content, scripts) {
    if (scripts.length === 0) {
        return content
    }

    var match = content.match(/<\/body>/)
    var position = match.index
    var scriptsStr = ''

    scripts.forEach(function(script) {
        var content

        if (common.isUrl(script)) {
            content = '<script src="' + script + '"></script>'
            scriptsStr += content
        } else {
            if (common.isExistedFile(script)) {
                logger.debug('Found insert script.', {
                    script: script
                })
                content = '<script>' + fs.readFileSync(script) + '</script>'
                scriptsStr += content
            } else {
                logger.warn('Not found insert script.', {
                    script: script
                })
            }
        }
    })

    return content.substring(0, position) +
            scriptsStr +
            content.substring(position)
}


function mainVersion(v){
    return v.substring(0, v.lastIndexOf('.'))
}

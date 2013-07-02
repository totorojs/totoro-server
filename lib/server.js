'use strict';

var inherits = require('util').inherits
var express = require('express')
var path = require('path')
var fs = require('fs')
var async = require('async')
var semver = require('semver')
var common = require('totoro-common')

var logger = common.logger
var proxy = require('./proxy')
var manager = require('./manager')

var MIN_CLIENT_VERSION = '0.2.1'

module.exports = Server

var defaultCfg = {
    serverHost : common.getExternalIpAddress(),
    serverPort : 9999,
    insertScripts: []
}

function Server(cfg) {
    var self = this
    var projectCfg = common.readCfgFile('totoro-config.json')
    self.cfg = common.mix(cfg, projectCfg, defaultCfg)
    self.launchServer()
}

Server.prototype.launchServer = function() {
    var self = this
    var cfg = self.cfg
    var app = self.app = express()
    var server = require('http').createServer(app)
    var io = self.io = require('socket.io').listen(server, {
        log : false
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
            res.send(insertScripts(captureContent, cfg.insertScripts))
        } else {
            res.send(captureContent)
        }
    })

    // runner proxy
    app.get('/runner/*', function(req, res) {
        proxy(req, res, io)
    })

    app.get('/list', function(req, res) {
        res.send(manager.list())
    })

    app.use(express.static(staticPath))

    server.listen(cfg.serverPort, cfg.serverHost, function(socket) {
        logger.info('start server: ' + cfg.serverHost + ':' + cfg.serverPort)
    })

    // labor socket
    io.of('/labor').on('connection', function(socket) {
        socket.on('init', function(data) {
            manager.addLabor(socket, data)
        })
    })

    // client socket
    io.of('/order').on('connection', function(socket) {
        socket.on('init', function(data) {
            var clientVersion = data.version
            if (!clientVersion || semver.lt(clientVersion, MIN_CLIENT_VERSION)) {
                socket.emit('report', [{
                    action: 'log',
                    info: {
                        type: 'error',
                        message: 'your totoro is outdated, please upgreade to the latest version.'
                    }
                }])

                return
            }
            manager.addOrder(socket, data)
        })
    })
}

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
            script = path.resolve(script)
            if (!common.isExistedFile(script)) {
                logger.warn('Not found file ' + script)
            } else {
                content = '<script>' + fs.readFileSync(script) + '</script>'
                scriptsStr += content
            }
        }
    })

    return content.substring(0, position) + scriptsStr +
            content.substring(position)
}

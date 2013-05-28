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

var MIN_CLIENT_VERSION = '0.2.0'

module.exports = Server

var defaultCfg = {
    serverHost : common.getExternalIpAddress(),
    serverPort : 9999,
    insertScripts: []
}

function Server(cfg) {
    var projectCfg = common.readCfgFile('totoro-config.json')
    this.cfg = common.mix(cfg, projectCfg, defaultCfg)
    this.launchServer()
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
            insertScripts(captureContent, cfg.insertScripts, function(content) {
                captureContent = content
                res.send(captureContent)
            })
        } else {
            res.send(captureContent)
        }
    })

    // runner proxy
    app.get('/runner/*', function(req, res) {
        proxy(req, res)
    })

    app.get('/list', function(req, res) {
        res.send(manager.list())
    })

    app.use(express.static(staticPath))

    server.listen(cfg.serverPort, cfg.serverHost, function(socket) {
        logger.debug('start server ' + cfg.serverHost + ':' + cfg.serverPort)
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

function insertScripts(content, scripts, callback) {
    if (scripts.length === 0) {
        callback(content)
        return
    }

    var match = content.match(/<\/body>/)
    var position = match.index
    var scriptsStr = ''

    async.forEach(scripts, function(script, cb) {
        var content

        if (common.isUrl(script)) {
            content = '<script src="' + script + '"></script>'
            scriptsStr += content
            cb()
        } else {
            script = path.resolve(script)
            if (!common.isExistedFile(script)) {
                logger.warn('Not found file ' + script)
            } else {
                content = '<script>' + fs.readFileSync(script) + '</script>'
                scriptsStr += content
            }
            cb()
        }

    }, function(err) {
        content = content.substring(0, position) + scriptsStr +
            content.substring(position)
        callback(content)
    })
}

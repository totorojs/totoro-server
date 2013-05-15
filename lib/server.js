'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var express = require('express')
var path = require('path')
var fs = require('fs')
var async = require('async')
var semver = require('semver')

var logger = require('./logger')
var proxy = require('./proxy')
var LaborManager = require('./labor-manager')
var OrderManager = require('./order-manager')
var Labor = require('./labor')
var Order = require('./order')
var utils = require('./utils')
var handleCfg = require('./handle-cfg')

var MIN_CLIENT_VERSION = '0.2.0'

module.exports = Server

function Server(cfg) {
    this.cfg = handleCfg(cfg)
    this.laborManager = new LaborManager()
    this.orderManager = new OrderManager()
    this.launchServer()
}

inherits(Server, EventEmitter)

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
        proxy.getContent(self, req, function(content) {
            res.writeHead(content.statusCode, content.headers)
            res.write(content.data)
            res.end()
        })
    })

    app.get('/list', function(req, res) {
        res.send(self.laborManager.list())
    })

    app.use(express.static(staticPath))

    server.listen(cfg.serverPort, cfg.serverHost, function(socket) {
        logger.debug('start server ' + cfg.serverHost + ':' + cfg.serverPort)
    })

    // labor socket
    io.of('/labor').on('connection', function(socket) {
        socket.on('init', function(data) {
            var labor = new Labor(socket.id, socket, data)
            self.laborManager.add(labor)
        })
    })

    // client socket
    io.of('/order').on('connection', function(socket) {
        socket.on('init', function(data) {
            var order = new Order(socket.id, socket, data)
            var clientVersion = data.version

            if (!clientVersion || semver.lt(clientVersion, MIN_CLIENT_VERSION)) {
                order.report({
                    action: 'log',
                    info: {
                        type: 'error',
                        message: 'your totoro is outdated, please upgreade to the latest version.'
                    }
                })

                return
            }
            self.orderManager.add(order)
            self.laborManager.distribute(order)
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

        if (utils.isUrl(script)) {
            utils.getUrl(script, function(body) {
                content = '<script>' + body + '</script>'
                scriptsStr += content
                cb()
            })
        } else {
            script = path.resolve(script)
            if (!utils.isExistedFile(script)) {
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

'use strict';

var inherits = require('util').inherits
var express = require('express')
var bodyParser = require('body-parser')
var path = require('path')
var fs = require('fs')
var utilx = require('utilx')

var logger = require('./logger')
var manager = require('./manager')
var Proxy = require('./proxy')


module.exports = Server


var defaultCfg = {
  host: utilx.getExternalIpAddress() || 'localhost',
  port: 9999
}


function Server(cfg) {
  if (cfg.debug) {
    logger.setLevel('debug')
  }

  var projectCfg = utilx.readJSON('totoro-server-config.json')
  this.cfg = utilx.mix(cfg, projectCfg, defaultCfg)
  this.launchServer()
}

Server.prototype.launchServer = function() {
  var cfg = this.cfg
  var app = this.app = express()
  var server = require('http').Server(app)
  var io = this.io = require('socket.io')(server, {
    log: false
  })

  /*
  io.set('transports', [
    'websocket',
    'jsonp-polling',
    'xhr-polling',
    'flashsocket',
    'htmlfile'
  ])
  */

  var staticPath = path.join(__dirname, '..', 'static')
  app.use('/__static', express.static(staticPath))
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))

  app.get('/', function(req, res) {
    res.sendFile(path.join(staticPath, 'driver.html'))
  })

  app.get('/__list', function(req, res) {
    res.send(manager.list())
  })

  app.post('/__report', function(req, res) {
    logger.debug('Received report data.', req.body)
    var data = req.body
    if ('__totoro_data' in data) {
      manager.report(JSON.parse(req.body.__totoro_data))
    } else {
      manager.report(req.body)
    }
    res.send('totoro server received data.')
  })

  // proxy
  app.get('*', function(req, res) {
    if (/\.ico$/.test(req.url)) {
      res.send('')
    } else {
      Proxy.proxy(req, res)
    }
  })

  server.listen(cfg.port, cfg.host, function(socket) {
    logger.info('Start server <', cfg.host + ':' + cfg.port, '>')
  })

  // labor socket
  io.of('/__labor').on('connection', function(socket) {
    socket.on('init', function(data) {
      if (!Array.isArray(data)) data = [data]
      data.forEach(function(d) {
        manager.addLabor(socket, d)
      })
    })
  })

  var serverVersion = require('../package.json').version
  var serverMainVersion = mainVersion(serverVersion)

  // client socket
  io.of('/__order').on('connection', function(socket) {
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

      manager.addOrder(socket, data)
    })
  })
}


function mainVersion(v){
  return v.substring(0, v.lastIndexOf('.'))
}

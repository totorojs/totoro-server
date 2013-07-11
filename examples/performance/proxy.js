'use strict';

var http = require('http')
var express = require('express')
var path = require('path')
var common = require('totoro-common')
var logger = common.logger

var cfg = {
    serverHost: common.getExternalIpAddress(),
    serverPort: 9996
}

function launchServer(){
    var self = this
    var app = express()
    var server = require('http').createServer(app)
    var io = require('socket.io').listen(server, {
        log : false
    })

    server.listen(cfg.serverPort, cfg.serverHost, function(socket) {
        console.info('start server: ' + cfg.serverHost + ':' + cfg.serverPort)
    })

    var clientCfg = {}
    var datas = ['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt', '163.html', 'sina.html', 'sohu.html', 'taobao.html', 'alipay.html']

    var httpSocket

    io.of('/http').on('connection', function(socket) {
        socket.on('begin', function(info) {
            console.info('begin http request test')
            var j = datas.length
            console.time('http')

            datas.forEach(function(p) {
                request(info.hostname, info.port, '/datas/' + p, function() {
                    j--
                    if (j === 0) {
                        console.timeEnd('http')
                    }
                })
            })
        })

        httpSocket = socket
    });

    // labor socket
    io.of('/proxy').on('connection', function(socket) {
        console.info('begin socket request test')

        var i = datas.length
        console.time('socket')

        datas.forEach(function(data) {
console.time('socket' + data)
            socket.emit('getInfo', data)
        })

        socket.on('proxyData', function(info) {
console.timeEnd('socket' + info.path)
            i--
            if (i === 0) {
                console.timeEnd('socket')

                if (httpSocket) {
                    httpSocket.emit('begin')
                } else {
                    setTimeout(function() {
                        httpSocket.emit('begin')
                    }, 20 * 1000)
                }
            }
        })
    })
}

function request(hostname, port, p, cb) {

    var opts = {
        hostname: hostname,
        port: port,
        path: p
    }
console.time('request' + p)
    http.request(opts, function(res) {
        var buffer = new Buffer(parseInt(res.headers['content-length'], 10))
        var offset = 0

        res.on('data', function(data) {
            data.copy(buffer, offset)
            offset += data.length
        })

        res.on('end', function() {
console.timeEnd('request' + opts.path)
            cb()
        })
    }).end()
}

launchServer()

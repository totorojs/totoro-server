'use strict';

var path = require('path')
var http = require('http')
var net = require('net')
var socketio = require('socket.io')
var jot = require('json-over-tcp')
var express = require('express')
var request = require('request')

var common = require('totoro-common')

var host = common.getExternalIpAddress()
var port = 9997
var files = ['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt',
            '163.html', 'sina.html', 'sohu.html', 'taobao.html', 'alipay.html']
var files = ['simple.html']
//var files = ['taobao.html']

var app = express()
var server = require('http').createServer(app)
var io = socketio.listen(server, {
    log : false
})

server.listen(port, host, function(socket) {
    console.log('Start server: ' + host + ':' + port)
})

io.sockets.on('connection', function (socket) {
    socket.emit('start', 'http')
    socket.on('start', function(data){
        proxyReq(data, socket)
    })
})


function proxyReq(data, socket) {
    var type = data.type
    var host = data.host
    var port = data.port
    var i = files.length

    console.log('\n== ' + type.toUpperCase() + ' START ==')
    console.time(type)

    if(type === 'socket.io') {
        socket.on('proxyRes', function(data) {
            i--
            var label = type + ': ' + data.path
            cb(label, i, 'socket.io', null, socket)
        })
    }

    files.forEach(function(file) {
        var label = type + ': ' + file
        console.time(label)

        if (type === 'http') {
            http.request({
                hostname : host,
                port : port,
                path : '/' + file,
            },
            function (res) {
                var buffer = new Buffer(parseInt(res.headers['content-length'], 10))
                var offset = 0

                res.on('data', function(data) {
                    data.copy(buffer, offset)
                    offset += data.length
                })

                res.on('end', function() {
                    i--
                    cb(label, i, 'http', 'request', socket)
                })
            }).end()

        } else if (type === 'request') {
            request(
                'http://' + host + ':' + port + '/' + file,
                function(err, res, body) {
                    i--
                    cb(label, i, 'request', 'socket.io', socket)
                }
            )

        } else if (type === 'socket.io') {
            socket.emit('proxyReq', file)
        }
    })
}

function cb(label, i, curType, nextType, socket){
    console.timeEnd(label)
    if (i === 0) {
        console.timeEnd(curType)
        console.log('== ' + curType.toUpperCase() + ' END ==\n')

        if (nextType) {
            socket.emit('start', nextType)
        } else {
            process.exit(0)
        }
    }
}






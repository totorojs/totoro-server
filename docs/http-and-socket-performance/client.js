'use strict';

var path = require('path')
var http = require('http')
var io = require('socket.io-client')
var jsonOverTCP = require('json-over-tcp')
var net = require('net')
var express = require('express')
var request = require('request')
var common = require('totoro-common')

var host = common.getExternalIpAddress()
var port = 9996
var capture = (process.argv[2] ? process.argv[2] : host) + ':' + 9997
console.log('Capture: ' + capture)


var app = express()
app.use(express.static(path.join(__dirname, 'static')))

app.listen(port, host, function() {
    console.info('Start client server: ' + host + ':' + port)
    var socket = io.connect('http://' + capture + '/stable')

    socket.on('connect', function() {
        socket.emit('start', {
            host : host,
            port : port
        })
    })

    socket.on('proxyReq', function(data) {
        var type = data.type
        var path = data.path

        request(
            'http://' + host + ':' + port + '/' + path,
            function (err, res, body) {
                var res = {
                    path : path,
                    statusCode : res.statusCode,
                    header : res.header,
                    body : body
                }

                if (type === 'socket.io') {
                    socket.emit('proxyRes', res)

                } else if (type === 'multiple socket.io') {
                    console.log('receive request:', type, ',', path)
                    var temp = io.connect('http://' + capture + '/temp')
                    temp.on('connect', function() {
                        console.log('temp socket connect:', type, ',', path)
                        temp.emit('proxyRes', res)
                    })
                    temp.on('disconnect', function() {
                        console.log('temp socket disconnect:', type, ',', path)
                    })
                }

            }
        )
    })

    socket.on('disconnect', function() {
        process.exit(0)
    })

})



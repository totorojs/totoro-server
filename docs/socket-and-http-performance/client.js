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
    var socket = io.connect('http://' + capture)

    socket.on('start', function(type) {
        socket.emit('start', {
            host : host,
            port : port,
            type : type
        })
    })

    socket.on('proxyReq', function(file) {
        /*
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
                socket.emit('proxyRes', {
                    path : file,
                    statusCode : res.statusCode,
                    header : res.header,
                    body : buffer
                })
            })
        }).end()*/

        request(
            'http://' + host + ':' + port + '/' + file,
            function (err, res, body) {
                socket.emit('proxyRes', {
                    path : file,
                    statusCode : res.statusCode,
                    header : res.header,
                    body : body
                })
            }
        )
    })

    socket.on('disconnect', function() {
        process.exit(0)
    })
})



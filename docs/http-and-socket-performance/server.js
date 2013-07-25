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
var client
var iSocket // stable socket

var rules = [
    /*['file size', 'concurrency', 'proxy type']*/
    ['small', 'low', 'http'],
    ['small', 'low', 'socket.io'],
    ['large', 'low', 'http'],
    ['large', 'low', 'socket.io'],
    ['small', 'high', 'http'],
    ['small', 'high', 'socket.io'],
    ['large', 'high', 'http'],
    ['large', 'high', 'socket.io'],
    ['small', 'high', 'multiple socket.io'],
    ['large', 'high', 'multiple socket.io']
]
var pos = 0 // current rule position
var amount // concurrency counter


var app = express()
var server = require('http').createServer(app)
var io = socketio.listen(server, {
    log : false
})

server.listen(port, host, function() {
    console.log('Start server: ' + host + ':' + port)
})

io.sockets.on('connection', function(socket) {
    socket.on('message', function(data) {
        console.log('---msg----')
    })
})

io.of('/stable').on('connection', function(socket) {
    iSocket = socket

    socket.on('start', function(data) {
        client = data
        proxyReq()
    })

    socket.on('proxyRes', function(data) {
        console.timeEnd(data.path)
        cb()
    })
})

io.of('/temp').on('connection', function(socket) {
    socket.on('proxyRes', function(data) {
        socket.disconnect()
        console.log('temp socket:', socket.id, 'get proxy response')
        console.timeEnd(data.path)
        cb()
    })
})


function proxyReq() {
    var host = client.host
    var port = client.port

    var rule = rules[pos]
    var size = rule[0]
    var concurrency = rule[1]
    var type = rule[2]

    var paths = getPaths(size, concurrency)
    amount = paths.length

    rule = rule.join(':')
    console.log('\n== ' + rule.toUpperCase() + ' START ==')
    console.time(rule)

    paths.forEach(function(path) {
        console.time(path)

        if (type === 'http') {
            request(
                'http://' + host + ':' + port + '/' + path,
                function(err, res, body) {
                    console.timeEnd(path)
                    cb()
                }
            )

        } else {
            iSocket.emit('proxyReq', {
                path : path,
                type : type
            })
        }
    })
}

function cb(){
    amount--
    if (amount === 0) {
        var rule = rules[pos]
        rule = rule.join(':')
        console.timeEnd(rule)
        console.log('== ' + rule.toUpperCase() + ' END ==')

        var len = rules.length
        if (pos < len - 1) {
            pos++
            proxyReq()
        } else {
            process.exit(0)
        }
    }
}

function getPaths(size, concurrency) {
    if (size === 'small') {
        if (concurrency === 'low') {
            return ['simple.html']
        } else {
            return [
                'simple.html',
                'simple1.html',
                'simple2.html',
                'simple3.html',
                'simple4.html',
                'simple.js',
                'simple1.js',
                'simple2.js',
                'simple3.js',
                'simple4.js'
            ]
        }
    } else {
        if (concurrency === 'low') {
            return ['taobao.html']
        } else {
            return [
                'taobao.html',
                'tmall.html',
                'etao.html',
                'amazon.html',
                'jquery-2.0.3.js',
                'sea-debug.js',
                'backbone.js',
                'taobao.txt',
                'tmall.txt',
                'etao.txt'
            ]
        }
    }
}






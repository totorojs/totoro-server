var express = require('express');
var path = require('path');

var app = this.app = express();
var server = require('http').createServer(app);
var io = this.io = require('socket.io').listen(server, {log: false});

app.use(express.static(__dirname));
server.listen(9999);

io.sockets.on('connection', function (socket) {
  socket.on('msg', function (data) {
    console.log(data);
  });
});


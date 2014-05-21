'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var logger = require('./logger')
var ua = require('./ua')


module.exports = Labor


function Labor(socket, data) {
  var that = this
  this.socket = socket
  this.ua = ua.parse(data)
  this.id = socket.id + '-' + this.ua.browser.name
  this.orders = {}

  socket.on('disconnect', function() {
    that.destroy()
  })

  logger.debug('New labor <', this.id, '>')
}


inherits(Labor, EventEmitter)


Labor.prototype.add = function(order) {
  var orderId = order.id

  this.orders[orderId] = order

  this.socket.emit('add', {
    orderId: orderId,
    laborId: this.id,
    ua: this.ua,
    href: order.parsedRunner.href
  })

  logger.debug('Labor <', this.id, '> adds order <', orderId, '>')
}


Labor.prototype.remove = function(orderId) {
  delete this.orders[orderId]

  this.socket.emit('remove', {
    orderId: orderId,
    laborId: this.id,
    ua: this.ua
  })

  logger.debug('Labor <', this.id, '> removes order <', orderId, '>')
}


Labor.prototype.destroy = function() {
  this.emit('destroy')
  this.removeAllListeners()
  logger.debug('Labor destroys <', this.id, '>')
}

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
    that.emit('disconnect')
  })

  logger.debug('New labor <', this.id, '>')
}

inherits(Labor, EventEmitter)


Labor.prototype.add = function(order, browser) {
  var orderId = order.id

  this.orders[orderId] = {
    instance: order,
    browser: browser
  }

  this.socket.emit('add', {
    orderId: orderId,
    ua: ua,
    href: order.parsedRunner.href
  })
  logger.debug('Labor <', this.id, '> adds order <', orderId, '>')
}

Labor.prototype.remove = function(orderId) {
  delete this.orders[orderId]

  this.socket.emit('remove', {
    orderId: orderId,
    ua: this.ua
  })
  this.emit('remove')

  logger.debug('Labor <', this.id, '> removes order <', orderId, '>')
}


Labor.prototype.destroy = function() {
  var that = this

  Object.keys(this.orders).forEach(function(orderId) {
    that.orders[orderId].remove(that.id)
  })

  this.removeAllListeners()
  logger.debug('Labor destroys <', this.id, '>')
}

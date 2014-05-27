'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var logger = require('./logger')
var ua = require('./ua')


module.exports = Labor


function Labor(socket, data) {
  var that = this
  this.socket = socket
  this.ua = ua.parse(data.ua)
  this.id = socket.id + '-' + this.ua.browser.name
  this.orders = {}
  this.server = data.server

  socket.on('disconnect', function() {
    that.destroy()
  })

  logger.info('New labor <', this.id, '>')
}


inherits(Labor, EventEmitter)


Labor.prototype.add = function(order) {
  var orderId = order.id

  this.orders[orderId] = order

  var href = order.parsedRunner.href
      href = href.replace(/https?\:\/\/[^/?#]+/, this.server)
  var hasQuery = href.indexOf('?') !== -1
  var url = href.replace(
    /(#.*$)|$/,
    (hasQuery ? '&' : '?') +'__totoro_oid=' + orderId +
    '&' + '__totoro_lid=' + this.id +
    '$1')

  this.socket.emit('add', {
    orderId: orderId,
    laborId: this.id,
    ua: this.ua,
    url: url
  })

  logger.info('Labor <', this.id, '> adds order <', orderId, '>')
}


Labor.prototype.remove = function(orderId) {
  delete this.orders[orderId]

  this.socket.emit('remove', {
    orderId: orderId,
    laborId: this.id,
    ua: this.ua
  })

  logger.info('Labor <', this.id, '> removes order <', orderId, '>')
}


Labor.prototype.destroy = function() {
  this.emit('destroy')
  this.removeAllListeners()
  logger.info('Labor destroys <', this.id, '>')
}

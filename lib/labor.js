'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var logger = require('./logger')
var trait = require('./trait')


module.exports = Labor


function Labor(socket, data) {
  var that = this
  this.socket = socket
  this.trait = trait.normalize(data)
  this.id = socket.id + '-' + this.trait.agent.name
  this.orders = {}

  socket.on('disconnect', function() {
    that.destroy()
  })

  logger.info('New labor <', this.id, '>', this.trait)
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

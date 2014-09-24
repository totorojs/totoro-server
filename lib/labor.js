'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var utilx = require('utilx')

var logger = require('./logger')
var trait = require('./trait')


module.exports = Labor


function Labor(socket, data) {
  var that = this
  this.socket = socket
  if (typeof data === 'string') data = trait.ua2trait(data)
  this.trait = trait.normalize(data, true)
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

  var oc = order.config
  var runner = oc.runner
  var server = 'http://' + oc.host + ':' + oc.port

  if (oc.proxy) {
    runner = runner.replace(/https?\:\/\/[^/?#]+/, server)
  }

  if (utilx.isUrl(runner)) {
    var hasQuery = runner.indexOf('?') !== -1
    runner = runner.replace(
      /(#.*$)|$/,
      (hasQuery ? '&' : '?') +'__totoro_oid=' + orderId +
      '&' + '__totoro_lid=' + this.id +
      '$1')
  }

  this.socket.emit('add', {
    orderId: orderId,
    laborId: this.id,
    laborTrait: this.trait,
    runner: runner,

    // backward compatible
    url: runner
  })

  logger.info('Labor <', this.id, '> adds order <', orderId, '>')
}


Labor.prototype.remove = function(orderId) {
  delete this.orders[orderId]

  this.socket.emit('remove', {
    orderId: orderId,
    laborId: this.id,
    laborTrait: this.trait
  })

  logger.info('Labor <', this.id, '> removes order <', orderId, '>')
}


Labor.prototype.destroy = function() {
  this.emit('destroy')
  this.removeAllListeners()
  logger.info('Labor destroys <', this.id, '>')
}

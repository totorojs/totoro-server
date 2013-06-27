'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var useragent = require('useragent')

var logger = require('./logger')

module.exports = Labor

function Labor(socket, data) {
    var self = this
    self.id = socket.id
    self.socket = socket
    self.ua = useragent.lookup(data.ua)

    self.orders = {}
    self.amount = 0
    self.isBusy = false
    self.isTired = false

    socket.on('report', function(data) {
        self.report(data)
    })
    socket.on('ping', function() {
        socket.emit('ping')
    })
    socket.on('disconnect', function(data) {
        self.destroy()
    })

    logger.debug('new labor: ' + self.id + ' [' + self.ua.toString() + ']')
}

inherits(Labor, EventEmitter)

Labor.prototype.add = function(order) {
    var self = this
    var orderId = order.id

    self.orders[orderId] = order
    self.socket.emit('add', {
        orderId: orderId,
        path: order.parsedRunner.path
    })
    logger.debug('labor: ' + self.id + ' add order: ' + orderId)

    // TODO improve the boundary values of isBusy and isTired
    if (Object.keys(self.orders).length === 5) {
        self.isBusy = true
        self.emit('busy')
        logger.debug('labor: ' + self.id + ' is busy')
    }

    self.amount ++
    if(self.amount >= 20) {
        self.isTired = true
        self.emit('tired')
        logger.debug('labor: ' + self.id + ' is tired')
    }
}

Labor.prototype.remove = function(orderId) {
    var self = this
    var socket = self.socket

    /*
     * NOTE
     *
     * self.remove() can be triggered by several conditions
     * such as:
     *     - Order destroy
     *     - browser end Labor.remove()
     * so, to avoid loop caused by custom event, need to check it first
     */
    if (orderId in self.orders) {
        delete self.orders[orderId]
        socket.emit('remove', orderId)
        logger.debug('labor: ' + self.id + ' remove order: ' + orderId)

        if (self.isBusy) {
            self.isBusy = false
            self.emit('free')
            logger.debug('labor: ' + self.id + ' is free')
        }

        if (self.isTired && Object.keys(self.orders).length === 0) {
            self.socket.emit('reload')
            logger.debug('labor: ' + self.id + ' will reload')
        }
    }
}

Labor.prototype.report = function(data) {
    var self = this
    var orders = self.orders
    data.forEach(function(item) {
        var orderId = item.orderId
        var order = orders[orderId]
        /*
         * NOTE
         *
         * when client disconnect, Labor will remove this unfinished Order
         * but browser not know this sync
         * it may send report before it recieves the instruction
         * so, need to check it first
         */
        if (order) {
            item.laborId = self.id
            ;delete item.orderId
            order.report(item)

            if (item.action === 'end') {
                self.remove(orderId)
                logger.debug('labor: ' + self.id + ' finish order: ' + orderId)
            }
        }
    })
}

Labor.prototype.destroy = function() {
    var self = this
    var laborId = self.id
    logger.debug('labor destroy: ' + self.id)
    Object.keys(self.orders).forEach(function(orderId) {
        self.orders[orderId].remove(laborId)
    })
    self.emit('destroy')
}

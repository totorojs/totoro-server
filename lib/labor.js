'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var detector = require('detector')
var logger = require('./logger')
var devices = require('./devices')


module.exports = Labor


function Labor(socket, data) {
    var that = this
    this.id = socket.id
    this.socket = socket
    var ua = this.ua = detector.parse(data.ua)
    this.ua.toString = function() {
        return ua.browser.name + ' ' + ua.browser.fullVersion + ' / ' +
               ua.os.name + ' ' + ua.os.fullVersion
    }


    this.type = this.ua.type = devices.getType(ua)
    this.orders = {}
    this.amount = 0
    this.isBusy = false
    this.isTired = false

    socket.on('report', function(data) {
        that.report(data)
    })
    socket.on('ping', function() {
        socket.emit('ping')
    })
    socket.on('disconnect', function(data) {
        that.destroy()
    })

    logger.debug('New labor<' + this.id + '>, UA<' + this.ua.toString() + '>')
}

inherits(Labor, EventEmitter)

Labor.prototype.add = function(order) {
    var orderId = order.id

    this.orders[orderId] = order
    this.socket.emit('add', {
        orderId: orderId,
        href: order.parsedRunner.href
    })
    logger.debug('Labor<' + this.id + '> add order<' + orderId + '>')

    // TODO improve the boundary values of isBusy and isTired
    if (Object.keys(this.orders).length === 5) {
        this.isBusy = true
        this.emit('busy')
        logger.debug('Labor<' + this.id + '> is busy.')
    }

    this.amount ++
    if(this.amount >= 20) {
        this.isTired = true
        this.emit('tired')
        logger.debug('Labor<' + this.id + '> is tired.')
    }
}

Labor.prototype.remove = function(orderId) {
    var socket = this.socket

    /*
     * NOTE
     *
     * this.remove() can be triggered by several conditions
     * such as:
     *     - Order destroy
     *     - browser end Labor.remove()
     * so, to avoid loop caused by custom event, need to check it first
     */
    if (orderId in this.orders) {
        delete this.orders[orderId]
        socket.emit('remove', orderId)
        logger.debug('Labor<' + this.id + '> remove order<' + orderId + '>')

        if (this.isBusy) {
            this.isBusy = false
            this.emit('free')
            logger.debug('Labor<' + this.id + '> is free.')
        }

        if (this.isTired && Object.keys(this.orders).length === 0) {
            this.socket.emit('reload')
            logger.debug('Labor<' + this.id + '> will reload.')
        }
    }
}

Labor.prototype.report = function(data) {
    var that = this
    var orders = this.orders
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
            item.laborId = that.id
            ;delete item.orderId
            order.report(item)

            if (item.action === 'end') {
                that.remove(orderId)
            }
        }
    })
}

Labor.prototype.destroy = function() {
    var that = this
    var laborId = this.id
    logger.debug('Labor<' + this.id +'> destroy.')
    Object.keys(this.orders).forEach(function(orderId) {
        that.orders[orderId].remove(laborId)
    })
    this.emit('destroy')
}

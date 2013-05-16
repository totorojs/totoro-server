'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var path = require('path')
var url = require('url')

var logger = require('./logger')

module.exports = Order

function Order(socket, data) {
    var self = this
    self.id = socket.id
    self.socket = socket
    socket.on('disconnect', function() {
        self.destroy()
    })

    self.runner = data.runner
    self.updateUrlInfo()
    self.browsers = data.browsers
    self.adapter = data.adapter

    self.waitingBrowsers = {/*
        browser: true
    */}
    self.browsers.forEach(function(browser) {
        self.waitingBrowsers[browser] = true
    })
    self.labors = {/*
        laborId:{
            browser: browser,
            isFinished: false,
            instance: labor
        }
    */}
    self.reports = []

    setInterval(function() {
        self.emitReports()
    }, 950)

    logger.debug('new order: ' + self.id + ' [' + self.browsers + ']')
}

inherits(Order, EventEmitter)

Order.prototype.assign = function(labor, browser) {
    var self = this
    var laborId = labor.id
    ;delete self.waitingBrowsers[browser]
    self.labors[laborId] = {
        browser: browser,
        isFinished: false,
        instance: labor
    }
    self.report({
        action: 'assign',
        browser: browser,
        info: {
            laborId: labor.id,
            ua: labor.ua.toString()
        }
    })
    clearTimeout(self.checkIsEndAllTimer)
    logger.debug('assign order: ' + self.id + ' [' + browser + ']' +
            ' to labor: ' + labor.id + ' [' + labor.ua.toString() + ']')
}

Order.prototype.unassign = function(laborId) {
    var self = this
    var labors = self.labors

    if (laborId in labors) {
        var browser = labors[laborId].browser
        self.waitingBrowsers[browser] = true
        ;delete self.labors[laborId]

        self.report({
            action: 'unassign',
            browser: browser
        })
        logger.debug('unassign order: ' + self.id + ' from labor: ' + laborId)
    }
}

Order.prototype.report = function(data) {
    var self = this
    var action = data.action
    var laborId = data.laborId

    if (action === 'log') {
        self.reports.push(data)
        return
    }

    if (action !== 'assign' && action !== 'unassign') {
        data.browser = self.labors[laborId].browser
        ;delete data.laborId
    }
    self.reports.push(data)

    if (data.action === 'end') {
        self.labors[laborId].isFinished = true

        if (Object.keys(self.waitingBrowsers).length) {
            // give more 30s to let not matched browsers have chance to match
            self.checkIsEndAllTimer = setTimeout(function() {
                self.checkIsEndAll()
            }, 30*1000)
        } else {
            self.checkIsEndAll()
        }
    }
}

Order.prototype.checkIsEndAll = function() {
    var self = this
    var labors = self.labors
    for (var i in labors) {
        if (!labors[i].isFinished) {
            return
        }
    }
    self.reports.push({action: 'endAll'})
}

Order.prototype.emitReports = function() {
    var self = this
    var socket = self.socket
    if (self.reports.length) {
        var data = self.reports
        self.reports = []
        socket.emit('report', data)
        logger.debug('order: ' + self.id + ' emit reports data')
    }
}

Order.prototype.destroy = function() {
    var self = this
    var labors = self.labors
    Object.keys(labors).forEach(function(laborId) {
        labors[laborId].instance.remove(self.id)
    })
    logger.debug('order: ' + self.id + ' destroy')
    self.emit('destroy')
}

Order.prototype.updateUrlInfo = function() {
    var urlObj = url.parse(this.runner)
    this.host = urlObj.hostname
    var protocol = urlObj.protocol
    protocol = protocol.slice(0, protocol.indexOf(':'))
    this.protocol = protocol
    this.port = urlObj.port || 80
    this.runner = urlObj.pathname
}

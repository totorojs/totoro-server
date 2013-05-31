'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var path = require('path')
var url = require('url')

var logger = require('totoro-common').logger

module.exports = Order

function Order(socket, data) {
    var self = this
    self.id = socket.id
    self.socket = socket
    socket.on('disconnect', function() {
        self.destroy()
    })

    self.runner = data.runner
    self.parsedRunner = url.parse(data.runner)
    self.charset = data.charset
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

    // in one minute, at least one labor is added, or will be forced to quit
    self.checkIsEndAllTimer = setTimeout(function() {
        self.checkIsEndAll()
    }, 30*1000)

    self.reports = []
    self.reportTimer = setInterval(function() {
        self.emitReports()
    }, 950)

    self.report({
        action: 'browsers',
        info: self.browsers
    })

    logger.debug('new order: ' + self.id + ' [' + self.browsers + ']')
}

inherits(Order, EventEmitter)

Order.prototype.add = function(labor, browser) {
    var self = this
    var laborId = labor.id
    ;delete self.waitingBrowsers[browser]
    self.labors[laborId] = {
        browser: browser,
        isFinished: false,
        instance: labor
    }
    self.report({
        action: 'add',
        browser: browser,
        info: {
            laborId: labor.id,
            ua: labor.ua.toString()
        }
    })
    clearTimeout(self.checkIsEndAllTimer)
    logger.debug('order: ' + self.id + ' [' + browser + ']' +
            ' add labor: ' + labor.id + ' [' + labor.ua.toString() + ']')
}

Order.prototype.remove = function(laborId) {
    var self = this
    var labors = self.labors

    if (laborId in labors) {
        var browser = labors[laborId].browser
        self.waitingBrowsers[browser] = true
        ;delete self.labors[laborId]

        self.report({
            action: 'remove',
            browser: browser
        })
        logger.debug('order: ' + self.id + ' remove labor: ' + laborId)
    }
}

Order.prototype.report = function(data) {
    var self = this
    var action = data.action
    var laborId = data.laborId

    switch (action) {
        case 'log':
        case 'browsers':
        case 'add':
        case 'remove':
            break
        default:
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

/*
 * check if all added labors have finished
 * don't care if there is still any not matched browser
 */
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
    clearInterval(self.reportTimer)
    logger.debug('order: ' + self.id + ' destroy')
    self.emit('destroy')
}

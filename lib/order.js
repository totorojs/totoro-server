'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var path = require('path')
var url = require('url')

var logger = require('totoro-common').logger


module.exports = Order


function Order(socket, data) {
    var that = this
    this.id = socket.id
    this.socket = socket
    socket.on('disconnect', function() {
        that.destroy()
    })

    this.runner = data.runner
    this.parsedRunner = url.parse(data.runner)
    this.charset = data.charset
    this.browsers = data.browsers
    this.adapter = data.adapter

    this.waitingBrowsers = {/*
        browser: true
    */}
    this.browsers.forEach(function(browser) {
        that.waitingBrowsers[browser] = true
    })
    this.labors = {/*
        laborId:{
            browser: browser,
            isFinished: false,
            instance: labor
        }
    */}

    // in one minute, at least one labor is added, or will be forced to quit
    this.checkIsEndAllTimer = setTimeout(function() {
        that.checkIsEndAll()
    }, 30*1000)

    this.reports = []
    this.reportTimer = setInterval(function() {
        that.emitReports()
    }, 950)

    this.report({
        action: 'browsers',
        info: this.browsers
    })

    logger.debug('new order: ' + this.id + ' [' + this.browsers + ']')
}

inherits(Order, EventEmitter)

Order.prototype.add = function(labor, browser) {
    var laborId = labor.id
    ;delete this.waitingBrowsers[browser]
    this.labors[laborId] = {
        browser: browser,
        isFinished: false,
        instance: labor
    }
    this.report({
        action: 'add',
        browser: browser,
        info: {
            laborId: labor.id,
            ua: labor.ua.toString()
        }
    })
    clearTimeout(this.checkIsEndAllTimer)
    logger.debug('order: ' + this.id + ' [' + browser+ ']' +
            ' add labor: ' + labor.id + ' [' + labor.ua.toString() + ']')
}

Order.prototype.remove = function(laborId) {
    var labors = this.labors

    if (laborId in labors) {
        var browser = labors[laborId].browser
        this.waitingBrowsers[browser] = true
        ;delete this.labors[laborId]

        this.report({
            action: 'remove',
            browser: browser
        })
        logger.debug('order: ' + this.id + ' remove labor: ' + laborId)
    }
}

Order.prototype.report = function(data) {
    var that = this
    var action = data.action
    var laborId = data.laborId

    switch (action) {
        case 'log':
        case 'browsers':
        case 'add':
        case 'remove':
            break
        default:
            data.browser = this.labors[laborId].browser
            ;delete data.laborId
    }
    this.reports.push(data)

    if (data.action === 'end') {
        this.labors[laborId].isFinished = true

        if (Object.keys(this.waitingBrowsers).length) {
            // give more 30s to let not matched browsers have chance to match
            this.checkIsEndAllTimer = setTimeout(function() {
                that.checkIsEndAll()
            }, 30*1000)
        } else {
            this.checkIsEndAll()
        }
    }
}

/*
 * check if all added labors have finished
 * don't care if there is still any not matched browser
 */
Order.prototype.checkIsEndAll = function() {
    var labors = this.labors
    for (var i in labors) {
        if (!labors[i].isFinished) {
            return
        }
    }
    this.reports.push({action: 'endAll'})
}

Order.prototype.emitReports = function() {
    var socket = this.socket
    if (this.reports.length) {
        var data = this.reports
        this.reports = []
        socket.emit('report', data)
    }
}

Order.prototype.destroy = function() {
    var id = this.id
    var labors = this.labors
    Object.keys(labors).forEach(function(laborId) {
        labors[laborId].instance.remove(id)
    })
    clearInterval(this.reportTimer)
    logger.debug('order: ' + this.id + ' destroy')
    this.emit('destroy')
}

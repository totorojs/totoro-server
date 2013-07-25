'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var path = require('path')
var url = require('url')
var common = require('totoro-common')
var logger = require('./logger')


module.exports = Order


function Order(socket, data) {
    var that = this

    this.startTime = new Date().getTime()

    this.id = socket.id
    this.socket = socket
    socket.on('disconnect', function() {
        that.destroy()
    })

    common.mix(this, data)
    this.parsedRunner = this.parse(this.runner)
    this.parsedAdapter = this.parse(this.adapter)
    // console.log(this.parsedRunner)

    this.waitingBrowsers = {/*
        browser: true
    */}
    this.browsers.forEach(function(browser) {
        that.waitingBrowsers[browser] = true
    })
    this.labors = {/*
        laborId : {
            browser : browser,
            isFinished : false,
            instance : labor
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
        action : 'browsers',
        info : this.browsers
    })

    logger.debug('New order<' + this.id + '> with params<' + JSON.stringify(data) + '>')
}

inherits(Order, EventEmitter)

Order.prototype.add = function(labor, browser) {
    var laborId = labor.id
    ;delete this.waitingBrowsers[browser]
    this.labors[laborId] = {
        browser : browser,
        isFinished : false,
        instance : labor
    }
    this.report({
        action : 'add',
        browser : browser,
        info : {
            laborId : labor.id,
            ua : labor.ua.toString()
        }
    })
    clearTimeout(this.checkIsEndAllTimer)
    logger.debug('Order<' + this.id + '>, browsers<' + browser+ '>' +
            ' add labor<' + labor.id + '>, UA<' + labor.ua.toString() + '>')
}

Order.prototype.remove = function(laborId) {
    var labors = this.labors

    if (laborId in labors) {
        var browser = labors[laborId].browser
        this.waitingBrowsers[browser] = true
        ;delete this.labors[laborId]

        this.report({
            action : 'remove',
            browser : browser
        })
        logger.debug('Order<' + this.id + '> remove labor<' + laborId + '>')
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
        logger.debug('Labor<' + laborId + '> finished order<' + this.id +
                '>, result<' + JSON.stringify(data.info) + '>')

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

    var duration = new Date().getTime() - this.startTime
    logger.debug('All labors finished order<' + this.id + '>, total time<' + duration + '>')

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
    logger.debug('Order<' + this.id + '> destroy.')
    this.emit('destroy')
}

Order.prototype.parse = function(p) {
    if (!p || common.isKeyword(p)) {
        return
    } else if(common.isUrl(p)) {
        return url.parse(p)
    } else {
        return url.parse('http://' + this.clientHost + ':' + this.clientPort + '/' + p)
    }
}

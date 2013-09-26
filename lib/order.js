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

    this.startTime = new Date()

    this.id = socket.id
    this.socket = socket
    socket.on('disconnect', function() {
        that.destroy()
    })

    common.mix(this, data)

    this.parsedRunner = parseUrl(this.runner, this.clientHost, this.clientPort)
    this.parsedAdapter = parseUrl(this.adapter, this.clientHost, this.clientPort)

    this.waitingBrowsers = {/* browser: tryTimes */}
    this.parsedBrowsers = {/* browser: parsedBrowser */}
    this.browsers.forEach(function(browser) {
        that.waitingBrowsers[browser] = 0
        that.parsedBrowsers[browser] = parseBrowser(browser)
    })

    this.labors = {}
    this.logs = {info: [], warn: [], error: []}

    this.timeoutTimer = setTimeout(function() {
        that.reports.push({action: 'timeout', info: that.wrapLabors()})
    }, this.timeout * 60 * 1000)

    this.reports = []
    this.reportTimer = setInterval(function() {
        that.emitReports()
    }, 950)

    this.report({
        action: 'debug',
        info: ['Specified browsers', {
            orderId: this.id,
            browsers: this.browsers
        }]
    })

    logger.info('New order', {
        orderId: this.id,
        config: data
    })
}

inherits(Order, EventEmitter)

Order.prototype.add = function(labor, browser) {
    var laborId = labor.id
    var tryTimes = this.waitingBrowsers[browser]

    this.labors[laborId] = {
        browser: browser,
        instance: labor,
        failures: [],
        stats: undefined,
        tryTimes: ++tryTimes,
        customLogs: []
    }

    ;delete this.waitingBrowsers[browser]

    this.report({
        action: 'debug',
        info: ['Order adds labor', {
            orderId: this.id,
            laborId: labor.id,
            ua: labor.ua.toString()
        }]
    })
}

Order.prototype.remove = function(laborId) {
    var labors = this.labors

    if (laborId in labors) {
        var labor = labors[laborId]
        var tryTimes = labor.tryTimes

        if (tryTimes > 2) {
            this.report({
                action: 'end',
                info: {
                    error:{
                        message: 'Unexpectedly interrupt for serveral times.'
                    }
                },
                laborId: laborId
            })

        } else {
            var browser = labors[laborId].browser
            this.waitingBrowsers[browser] = ++tryTimes
            ;delete this.labors[laborId]
        }

        this.report({
            action: 'debug',
            info: ['Order removes labor', {
                orderId: this.id,
                laborId: laborId
            }]
        })
    }
}

Order.prototype.report = function(data) {
    var that = this
    var action = data.action
    var info = data.info
    var laborId = data.laborId

    switch (action) {
        // custom logs, user write in testing code via totoro.log()
        case 'log':
            var item = this.labors[data.laborId]
            item.customLogs.push(info)
            break

        // system logs
        case 'debug':
        case 'info':
        case 'warn':
        case 'error':
            if (typeof info === 'string') {
                data.info = [info]
            }
            this.reports.push(data)
            this.logs[action] && this.logs[action].push(info)
            logger[action].apply(logger, data.info)
            break

        case 'pass':
        case 'pending':
            this.reports.push({action: action})
            break
        case 'fail':
            this.reports.push({action: action})
            this.labors[laborId].failures.push(data.info)
            break
        case 'end':
            this.labors[laborId].stats = data.info
            this.checkIsEndAll()
            break
        default:
            break
    }
}

/*
 * check if all added labors have finished
 * don't care if there is still any not matched browser
 */
Order.prototype.checkIsEndAll = function() {
    var labors = this.labors
    for (var i in labors) {
        if (!labors[i].stats) {
            return
        }
    }

    this.reports.push({action: 'endAll', info: this.wrapLabors()})
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

    var duration = new Date() - this.startTime
    logger.info('Order destroys', {
        orderId: this.id,
        duration: duration,
        labors: this.wrapLabors(),
        logs: this.logs
    })
    this.emit('destroy')
}

Order.prototype.wrapLabors = function() {
    var waitingBrowsers = this.waitingBrowsers
    var labors = this.labors
    var rt = {}

    Object.keys(waitingBrowsers).forEach(function(browser) {
        // weird! if undefined is assigned to this key, it is not enumerable
        rt[browser] = null
    })

    Object.keys(labors).forEach(function(laborId) {
        var item = labors[laborId]
        var labor = item.instance
        rt[item.browser] = {
            ua: labor.ua.toString(),
            failures: item.failures,
            stats: item.stats,
            customLogs: item.customLogs
        }
    })

    return rt
}


function parseUrl(p, host, port) {
    if (!p || common.isKeyword(p)) {
        return
    } else if(common.isUrl(p)) {
        return url.parse(p)
    } else {
        return url.parse('http://' + host + ':' + port + '/' + p)
    }
}


var versionReg = /\/(\d+\.)*\d+$/g
var singleSlashReg = /^[^/]*\/[^/]*$/g

function parseBrowser(browser) {
    var prev = browser
    browser = browser.toLowerCase()

    if(!browser.match(versionReg)) {
        browser = browser + '/'
    }
    if(browser.match(singleSlashReg)) {
        browser = '/' + browser
    }
    // logger.debug('Parse browser<' + prev +'> into <' + browser + '>')
    return browser.split('/')
}


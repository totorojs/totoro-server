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
  this.logs = {warn: [], error: []}

  this.timeoutTimer = setTimeout(function() {
    that.report({action: 'timeout', info: that.wrapLabors()})
  }, this.timeout * 60 * 1000)

  this.reports = []
  this.reportsTimer = setInterval(function() {
    that.emitReports()
  }, 1000)

  if (this.browsers.length) {
    this.report({
      action: 'debug',
      info: ['Order <', this.id, '> specifies browsers', this.browsers]
    })

  } else {
    // no active browsers when autoBrowsers() called
    this.report({
      action: 'error',
      info: 'No active browser, please try again later.'
    })
  }

  logger.info('New order', { orderId: this.id, config: data })
}

inherits(Order, EventEmitter)

Order.prototype.add = function(labor, browser) {
  var laborId = labor.id
  var tryTimes = this.waitingBrowsers[browser]

  ;delete this.waitingBrowsers[browser]
  this.labors[laborId] = {
    browser: browser,
    ua: labor.ua.toString(),
    instance: labor,
    errors: [], // errors caught by window.onerror
    failures: [],
    stats: undefined,
    customLogs: [],
    terminated: undefined, // why terminated by server, etc.try too many times
    tryTimes: ++tryTimes
  }

  this.report({
    action: 'debug',
    info: ['Order <', this.id, '> adds labor <', laborId, '>']
  })
}

Order.prototype.remove = function(laborId) {
  var labors = this.labors

  this.report({
    action: 'debug',
    info: ['Order <', this.id, '> removes labor <', laborId, '>']
  })

  var labor = labors[laborId]
  var tryTimes = labor.tryTimes

  if (tryTimes > 2) {
    ;delete labor.instance
    labor.terminated = 'Interrupted unexpectly for serveral times.'
    this.checkIsEndAll()
    return false

  } else {
    var browser = labors[laborId].browser
    this.waitingBrowsers[browser] = tryTimes
    ;delete this.labors[laborId]
    return true
  }
}

// NOTE
// during the time
// order finished (all complete / timeout) and
// destroy() triggered by client's disconnection
// it may still receives some report:
//   1. order finished with timeout labor, a unfinished labor send 'end' info
//   2. order finished normally, a timeout triggered
Order.prototype.report = function(data) {
  if (this.finished) return

  var that = this
  var action = data.action
  var info = data.info
  var laborId = data.laborId
  var labor = this.labors[laborId]

  switch (action) {
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
    case 'onerror':
      labor.errors = data.info
      break
    case 'end':
      this.reports.push({
        action: 'debug',
        info: ['Labor <', laborId, '> finished order <', this.id, '>']
      })
      common.mix(labor, data.info, true)
      ;delete labor.instance
      this.checkIsEndAll()
      break
    case 'endAll':
    case 'timeout':
      this.reports.push(data)
      this.finished = true
    default:
      break
  }
}

Order.prototype.checkIsEndAll = function() {
  var labors = this.labors

  if (Object.keys(this.waitingBrowsers).length) {
    return
  }

  for (var i in labors) {
    var labor = labors[i]
    if (!labor.stats && !labor.terminated) {
      return
    }
  }

  this.report({action: 'endAll', info: this.wrapLabors()})
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
  this.emit('destroy')
  this.removeAllListeners()

  clearTimeout(this.timeoutTimer)
  clearInterval(this.reportsTimer)

  var duration = new Date() - this.startTime
  logger.info('Order destroys', {
    orderId: this.id,
    duration: duration,
    labors: this.wrapLabors(),
    logs: this.logs
  })
}


Order.prototype.wrapLabors = function() {
  if (this.wrappedLabors) return this.wrappedLabors

  var waitingBrowsers = this.waitingBrowsers
  var labors = this.labors
  var rt = {}

  Object.keys(waitingBrowsers).forEach(function(browser) {
    // weird! if undefined is assigned to this key, it is not enumerable
    rt[browser] = null
  })

  Object.keys(labors).forEach(function(laborId) {
    var item = labors[laborId]
    var witem = common.mix({}, item)
    ;delete witem.browser
    ;delete witem.instance
    ;delete witem.tryTimes
    rt[item.browser] = witem
  })

  this.wrappedLabors = rt
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


'use strict';

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var path = require('path')
var url = require('url')
var utilx = require('utilx')

var logger = require('./logger')
var trait = require('./trait')


module.exports = Order


function Order(socket, data) {
  var that = this

  this.startTime = new Date()

  this.id = socket.id
  this.socket = socket
  socket.on('disconnect', function() {
    that.destroy()
  })

  this.config = data

  if (utilx.isUrl(data.runner)) this.parsedRunner = url.parse(data.runner)
  if (utilx.isUrl(data.adapter)) this.parsedAdapter = url.parse(data.adapter)

  this.parsedLabors= {/*str: obj*/}
  this.waitingLabors = {/*str: tryTimes*/}
  data.labors.forEach(function(item) {
    var obj = trait.normalize(item)
    var str = trait.tostr(obj)
    that.parsedLabors[str] = obj
    that.waitingLabors[str] = 0
  })

  this.labors = {}

  this.timeoutTimer = setTimeout(function() {
    that.report({action: 'timeout', info: that.wrapLabors()})
  }, data.timeout * 60 * 1000)

  this.reports = []
  this.reportsTimer = setInterval(function() {
    that.emitReports()
  }, 1000)

  logger.info('New order', { orderId: this.id, config: data })
}

inherits(Order, EventEmitter)

Order.prototype.add = function(labor, traitStr) {
  var laborId = labor.id
  var tryTimes = this.waitingLabors[traitStr]

  ;delete this.waitingLabors[traitStr]
  this.labors[laborId] = {
    traitStr: traitStr,
    instance: labor,
    tryTimes: ++tryTimes,
    info: undefined
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
    ;delete labor.info
    this.checkIsEndAll()
    return false

  } else {
    var traitStr = labors[laborId].traitStr
    this.waitingLabors[traitStr] = tryTimes
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
      logger[action].apply(logger, data.info)
      break
    case 'onerror':
      labor.info = data.info
      break
    case 'end':
      labor.info = data.info
      ;delete labor.instance

      this.reports.push({
        action: 'end',
        info: labor.traitStr
      })

      this.checkIsEndAll()
      break
    case 'endAll':
    case 'timeout':
      this.reports.push(data)
      this.finished = true
    default:
      this.reports.push(data)
      break
  }
}

Order.prototype.checkIsEndAll = function() {
  if (Object.keys(this.waitingLabors).length) {
    return
  }

  var labors = this.labors
  for (var i in labors) {
    if ('instance' in labors[i]) {
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
    labors: this.wrapLabors()
  })
}


Order.prototype.wrapLabors = function() {
  if (this.wrappedLabors) return this.wrappedLabors

  var parsedLabors = this.parsedLabors
  var waitingLabors = this.waitingLabors
  var labors = this.labors
  var rt = {}

  Object.keys(labors).forEach(function(laborId) {
    var item = labors[laborId]
    var traitStr = item.traitStr
    rt[traitStr] = {
      labor: parsedLabors[traitStr],
      tryTimes: item.tryTimes,
      info: item.info
    }
  })

  Object.keys(waitingLabors).forEach(function(traitStr) {
    rt[traitStr] = {
      labor: parsedLabors[traitStr],
      tryTimes: waitingLabors[traitStr]
    }
  })

  this.wrappedLabors = rt
  return rt
}



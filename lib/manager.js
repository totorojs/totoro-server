'use strict';

var logger = require('./logger')
var Labor = require('./labor')
var Order = require('./order')


module.exports = {
  labors: {}, // all labors, contains availableLabors
  availableLabors: {},

  orders: {}, // all orders, contains waitingOrders
  waitingOrders: {},

  addLabor: function(socket, data) {
    var that = this
    var labor = new Labor(socket, data)
    var laborId = labor.id

    this.labors[laborId] = labor

    labor.on('destroy', function() {
      that.removeLabor(laborId)
    })

    logger.debug('Manager adds labor <', laborId, '>')

    // logger.debug('Allocate when new labor <', laborId, '>')
    this.allocate(null, laborId)
  },

  removeLabor: function(laborId) {
    var that = this
    var labor = this.labors[laborId]

    ;delete this.labors[laborId]
    ;delete this.availableLabors[laborId]

    logger.debug('Manager removes labor <', laborId, '>')

    Object.keys(labor.orders).forEach(function(orderId) {
      // if tried too many times, return false
      if (that.orders[orderId].remove(laborId)) {

        // logger.debug('Allocate when remove labor <', laborId, '>')
        that.allocate(orderId)
      }
    })
  },


  addOrder: function(socket, data) {
    var that = this
    data.browsers = data.browsers || this.autoBrowsers()
    var order = new Order(socket, data)
    var orderId = order.id

    this.orders[orderId] = order

    order.on('destroy', function() {
      that.removeOrder(orderId)
    })

    logger.debug('Manager adds order <', orderId, '>')

    // logger.debug('Allocate when new order <', orderId, '>')
    this.allocate(orderId)
  },

  removeOrder: function(orderId) {
    var that = this
    var order = this.orders[orderId]

    ;delete this.orders[orderId]
    ;delete this.waitingOrders[orderId]

    logger.debug('Manager removes order <', orderId, '>')

    Object.keys(order.labors).forEach(function(laborId) {
      // NOTE
      // if a test always makes some kind of browser crashes
      // when the last try failed
      // the labor destroys
      // but the order won't remove it and won't try again
      // so need to check if it exists
      if (!(laborId in that.labors)) return

      that.labors[laborId].remove(orderId)

      // logger.debug('Allocate when remove order <', orderId, '>')
      that.allocate(null, laborId)
    })
  },

  /*
   * NOTE
   *
   * when this method should be triggered?
   * 1. more waiting orders
   *   - new order
   *   - labor destroyed with unfinished orders
   * 2. more available labors
   *   - new labor
   *   - busy labor to be free
   *
   * so, polling is not necessary, even if there are still waiting orders
   */
  allocate: function(orderId, laborId) {
    logger.debug('Allocate', {orderId: orderId, laborId: laborId})

    var that = this

    if (orderId) {
      var order = this.orders[orderId]
      this.waitingOrders[orderId] = order

      Object.keys(order.waitingBrowsers).forEach(function(browser) {
        var lids = Object.keys(that.availableLabors)
        lids.some(function(lid) {
          var labor = that.labors[lid]
          return that.assign(order, browser, labor)
        })
      })

    } else /*if (laborId)*/{
      var labor = this.labors[laborId]
      this.availableLabors[laborId] = labor

      Object.keys(this.waitingOrders).some(function(orderId) {
        var order = that.orders[orderId]
        return Object.keys(order.waitingBrowsers).some(function(browser) {
          return that.assign(order, browser, labor)
        })
      })
    }
  },

  assign: function(order, browser, labor) {
    if (!isMatch(order, browser, labor)) return

    delete this.availableLabors[labor.id]
    labor.add(order)

    order.add(labor, browser)
    if (!Object.keys(order.waitingBrowsers).length) {
      delete this.waitingOrders[order.id]
    }
    return true
  },

  report: function(data) {
    var orderId = data.orderId
    if (!(orderId in this.orders)) {
      // NOTE
      // a order destorys because timeout
      // before unfinished browser closes
      // it may be still send message
      logger.warn('Report data error: not found order <', orderId, '>')
      return
    }

    var laborId = data.laborId
    if (!(laborId in this.labors)) {
      // NOTE
      // a labor destroys
      // the runner opened by it may still send message
      logger.warn('Report data error: not found labor <', laborId, '>')
      return
    }

    var order = this.orders[orderId]
    var labor = this.labors[laborId]
    var action = data.action

    if (action === 'end' || action === 'onerror') {
      order.report(data)
      labor.remove(orderId)
      this.availableLabors[laborId] = labor
    } else {
      logger.warn('Report data error: unkown data action <', action, '>')
    }
  },

  list: function() {
    var rt = {}
    var labors = this.labors
    var availableLabors = this.availableLabors

    Object.keys(labors).forEach(function(laborId) {
      var labor = labors[laborId]
      var ua = labor.ua
      var uaStr = ua.toString()
      var group = ua.group

      rt[group] = rt[group] || {}
      rt[group][uaStr] = rt[group][uaStr] || {free: 0, busy: 0}

      if (laborId in availableLabors) {
        rt[group][uaStr].free++
      } else {
        rt[group][uaStr].busy++
      }
    })

    logger.debug('List available browsers', rt)
    return rt
  },

  autoBrowsers: function() {
    var rt = {}
    var labors = this.labors

    Object.keys(labors).forEach(function(laborId) {
      var labor = labors[laborId]
      var ua = labor.ua
      if (ua.browser.name.toLowerCase() === 'ie' ) {
        rt[ua.browser.name + '/' + ua.browser.version] = true
      } else {
        rt[ua.browser.name] = true
      }
    })

    // logger.debug('Auto browsers', rt)
    return Object.keys(rt)
  }
}


function isMatch(order, browser, labor) {
  var parsedBrowser = order.parsedBrowsers[browser]
  var ua = labor.ua
  return [ua.os.name, ua.browser.name, ua.browser.fullVersion ].every(
    function(item, idx) {
      /*
       * TODO:
       *
       * need to fix a potential bug
       * 'mobile_safari'.match('safari') == true
       * this is not as expected
       */
      var item2 = parsedBrowser[idx]
      if (!item2 || item.toLowerCase().match(item2)) {
        return true
      }
    }
  )
}


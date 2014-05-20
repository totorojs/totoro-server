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

    // logger.debug('Allocate when new labor')
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
      if (labor.orders[orderId].remove(labor.id)) {
        // logger.debug('Allocate() when remove labor with unfinished orders.')
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
    this.waitingOrders[orderId] = order

    order.on('destroy', function() {
      that.removeOrder(orderId)
    })

    logger.debug('Manager adds order <', orderId, '>')

    // logger.debug('Allocate() when new order.')
    this.allocate(orderId)
  },

  removeOrder: function(orderId) {
    var that = this

    ;delete this.orders[orderId]
    ;delete this.waitingOrders[orderId]

    logger.debug('Manager removes order <', orderId, '>')

    var order = this.orders[orderId]
    var labors = order.labors
    Object.keys(labors).forEach(function(laborId) {
      var labor = labors[laborId].instance
      labor.remove(orderId)

      // logger.debug('Allocate when labor removes order.')
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
    var that = this

    if (!orderId) {
      Object.keys(this.waitingOrders).forEach(function(woid) {
        that.allocate(woid, laborId)
      })
      return
    }

    var order = this.orders[orderId]
    this.waitingOrders[orderId] = order

    if (laborId) this.availableLabors[laborId] = this.labors[laborId]

    Object.keys(order.waitingBrowsers).forEach(function(browser) {
      var lids = laborId ? [laborId] : Object.keys(that.availableLabors)

      lids.some(function(lid) {
        var labor = that.availableLabors[lid]
        if (isMatch(order.parsedBrowsers[browser], labor.ua)) {
          // browser specifies by user may be: ie, ie/8 or windows/ie/8
          order.add(labor, browser)

          ;delete that.availableLabors[lid]
          labor.add(order)
          return true
        }
      })
    })

    if (!Object.keys(order.waitingBrowsers).length) {
      delete this.waitingOrders[orderId]
    }
  },

  report: function(data) {
    if (!data) return

    var orderId = data.orderId
    if (!orderId) return

    var order = this.orders[data.orderId]
    if (!order) return

    logger.warn(data)
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


function isMatch(parsedBrowser, ua) {
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



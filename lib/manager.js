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
    this.availableLabors[laborId] = labor
    logger.debug('Manager adds labor <', laborId, '>')

    labor.on('disconnect', function() {
      labor.destroy()
      that.removeLabor(laborId)
    })

    labor.on('add', function() {
      delete that.availableLabors[laborId]
    })

    labor.on('remove', function() {
      that.availableLabors[laborId] = labor

      // logger.debug('Distribute when labor removes order.')
      var al = {}
      al[laborId] = labor
      that.distribute(null, al)
    })

    // logger.debug('Distribute when add new labor.')
    var al = {}
    al[laborId] = labor
    this.distribute(null, al)
  },

  removeLabor: function(laborId) {
    var that = this
    var labor = this.labors[laborId]

    ;delete this.labors[laborId]
    ;delete this.availableLabors[laborId]

    logger.debug('Manager removes labor <', laborId, '>')

    if (!labor || Object.keys(labor.orders).length === 0) {
      return
    }

    // add not finished orders to .waitingOrders again
    var wo = {}
    Object.keys(labor.orders).forEach(function(orderId) {
      var order = labor.orders[orderId]
      that.waitingOrders[orderId] = order
      wo[orderId] = order
    })

    // logger.debug('Distribute() when remove labor with unfinished orders.')
    this.distribute(wo)
  },

  addOrder: function(socket, data) {
    var that = this
    data.browsers = data.browsers || this.autoBrowsers()

    var order = new Order(socket, data)
    var orderId = order.id

    this.orders[orderId] = order
    this.waitingOrders[orderId] = order

    logger.debug('Manager adds order <', orderId, '>')

    order.on('disconnect', function() {
      order.destroy()
      that.removeOrder(orderId)
    })

    // logger.debug('Distribute() when new order.')
    var o = {}
    o[orderId] = order
    this.distribute(o)
  },

  removeOrder: function(orderId) {
    delete this.orders[orderId]
    ;delete this.waitingOrders[orderId]

    logger.debug('Manager removes order <', orderId, '>')
  },

  /*
   * NOTE
   *
   * when this method should be triggered?
   * 1. more orders wait
   *   - new order
   *   - labor destroyed with unfinished orders
   * 2. more labors available
   *   - new labor
   *   - busy labor to be free
   *
   * so, polling is not necessary, even if there are still waiting orders
   */
  distribute: function(waitingOrders, availableLabors) {
    waitingOrders = waitingOrders || this.waitingOrders
    availableLabors = availableLabors || this.availableLabors

    Object.keys(waitingOrders).forEach(function(orderId) {
      var order = waitingOrders[orderId]
      var waitingBrowsers = order.waitingBrowsers
      var parsedBrowsers = order.parsedBrowsers

      Object.keys(waitingBrowsers).forEach(function(browser) {
        var parsedBrowser = parsedBrowsers[browser]

        Object.keys(availableLabors).some(function(laborId) {
          var labor = availableLabors[laborId]
          if (isMatch(parsedBrowser, labor.ua)) {
            // browser passed in order.add() cannot be replaced with labor.ua.browser.name
            // the browser specified by user may be: ie, ie/8 or windows/ie/8
            order.add(labor, browser)
            labor.add(order)
            return true
          }
        })
      })

      if (!Object.keys(waitingBrowsers).length) {
        delete waitingOrders[orderId]
      }
    })
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



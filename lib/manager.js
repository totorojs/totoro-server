'use strict';

var logger = require('./logger')
var Labor = require('./labor')
var Order = require('./order')


module.exports = {
  drivers: {},

  labors: {}, // all labors, contains availableLabors
  availableLabors: {},

  orders: {}, // all orders, contains waitingOrders
  waitingOrders: {},

  addDriver: function(socket, data) {
    var that = this
    var prevId = data.prevId
    var id = data.id

    if (prevId && prevId in this.drivers) this.removeDriver(prevId)

    if (id in this.drivers) {
      logger.warn('Repeated driver id', data)
      return
    }

    this.drivers[id] = socket
    socket.on('disconnect', function() {
      that.removeDriver(id)
    })

    logger.debug('Manager adds driver', data)
  },

  removeDriver: function(driverId) {
    this.drivers[driverId].removeAllListeners('disconnect')
    ;delete this.drivers[driverId]
    logger.debug('Manager removes driver', {driverId: driverId})
  },

  addLabor: function(socket, data) {
    var that = this
    var labor = new Labor(socket, data)
    var laborId = labor.id

    this.labors[laborId] = labor
    this.availableLabors[laborId] = labor

    logger.debug('Manager adds labor', {laborId: laborId})

    labor.on('destroy', function() {
      that.removeLabor(laborId)
    })

    labor.on('retire', function() {
      var laborId = labor.id
      var driverId = labor.driverId

      if (!driverId) {
        logger.debug('Retired labor opened without driver.', {
          laborId: laborId
        })
        return
      }

      if (driverId in that.drivers) {
        logger.debug('Driver of retired labor exists.', {
          laborId: laborId,
          driverId: driverId
        })

        var driverSocket = that.drivers[driverId]
        driverSocket.emit('retire', {
          id: driverId,
          browser: labor.ua.browser.name
        })
        return
      }

      logger.debug('Driver of retired labor dose not exists.', {
        laborId: laborId,
        driverId: driverId
      })
    })

    labor.on('busy', function() {
      delete that.availableLabors[laborId]
    })

    labor.on('free', function() {
      that.availableLabors[laborId] = labor

      // logger.debug('Distribute() called because labor is free.')
      var b = {}
      b[laborId] = labor
      that.distribute(null, b)
    })

    // logger.debug('Distribute() called because labor is added.')
    var b = {}
    b[laborId] = labor
    this.distribute(null, b)
  },

  removeLabor: function(laborId) {
    var that = this
    var labor = this.labors[laborId]

    ;delete this.labors[laborId]
    ;delete this.availableLabors[laborId]

    logger.debug('Manager removes labor', {laborId: laborId})

    if (!labor || Object.keys(labor.orders).length === 0) {
      return
    }

    // add not finished orders to this.waitingOrders to get match again
    var o = {}
    Object.keys(labor.orders).forEach(function(orderId) {
      var order = labor.orders[orderId]
      that.waitingOrders[orderId] = order
      o[orderId] = order
    })

    // logger.debug('Distribute() called because labor is removed with unfinished orders.')
    this.distribute(o)
  },

  addOrder: function(socket, data) {
    var that = this
    data.browsers = data.browsers || this.autoBrowsers()

    var order = new Order(socket, data)
    var orderId = order.id

    this.orders[orderId] = order
    this.waitingOrders[orderId] = order

    logger.debug('Manager adds order', {orderId: orderId})

    order.on('destroy', function() {
      that.removeOrder(orderId)
    })

    // logger.debug('Distribute() called because order is added.')
    var o = {}
    o[orderId] = order
    this.distribute(o)
  },

  removeOrder: function(orderId) {
    delete this.orders[orderId]
    ;delete this.waitingOrders[orderId]
    logger.debug('Manager removes order', {orderId: orderId})
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

        Object.keys(availableLabors).reverse().some(function(laborId) {
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

    Object.keys(labors).forEach(function(laborId) {
      var labor = labors[laborId]
      var ua = labor.ua
      var uaStr = ua.toString()
      var group = ua.group
      rt[group] = rt[group] || {}
      rt[group][uaStr] = (rt[group][uaStr] || 0) + 1
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



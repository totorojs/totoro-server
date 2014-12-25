'use strict';

var logger = require('./logger')
var Labor = require('./labor')
var Order = require('./order')
var trait = require('./trait')


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

    if (!data.labors) {
      data.labors = this.autoLabors()

      if (data.labors.length) {
        socket.emit('report', [{
          action: 'info',
          info: 'Specified labors automatically by server < ' + data.labors + ' >'
        }])

      } else {
        socket.emit('report', [{
          action: 'error',
          info: 'No active browser, please try again later.'
        }])
        return
      }
    }

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

      // skip finished/terminated labor
      // the property instance had been removed when finished/terminated
      if (!('instance' in order.labors[laborId])) return

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

      Object.keys(order.waitingLabors).forEach(function(traitStr) {
        var lids = Object.keys(that.availableLabors)
        lids.some(function(lid) {
          var labor = that.labors[lid]
          if (isMatch(order, traitStr, labor)) {
            logger.debug('Matched', {traitStr: traitStr, laborTrait: labor.trait})
            that.assign(order, traitStr, labor)
            return true
          }
        })
      })

    } else /*if (laborId)*/{
      var labor = this.labors[laborId]
      this.availableLabors[laborId] = labor

      Object.keys(this.waitingOrders).some(function(orderId) {
        var order = that.orders[orderId]
        return Object.keys(order.waitingLabors).some(function(traitStr) {
          if (isMatch(order, traitStr, labor)) {
            logger.debug('Matched', {traitStr: traitStr, laborTrait: labor.trait})
            that.assign(order, traitStr, labor)
            return true
          }
        })
      })
    }
  },

  assign: function(order, traitStr, labor) {
    delete this.availableLabors[labor.id]
    labor.add(order)
    order.add(labor, traitStr)
    if (!Object.keys(order.waitingLabors).length) {
      delete this.waitingOrders[order.id]
    }
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

    if (action === 'end') {
      order.report(data)
      labor.remove(orderId)
      // logger.debug('Allocate when labor finished a order <', laborId, '>')
      this.allocate(null, laborId)

    } else { // action === 'onerrror' or some other action else
      order.report(data)
    }
  },

  list: function() {
    var rt = {}
    var labors = this.labors
    var availableLabors = this.availableLabors

    Object.keys(labors).forEach(function(laborId) {
      var labor = labors[laborId]
      var isFree = laborId in availableLabors ? true : false
      rt[laborId] = {trait: labor.trait, isFree: isFree}
    })

    logger.debug('List available browsers', rt)
    return rt
  },

  autoLabors: function() {
    var rt = {}
    var labors = this.labors

    Object.keys(labors).forEach(function(laborId) {
      var labor = labors[laborId]
      var trait = labor.trait
      if (trait.group !== 'desktop') return

      if (trait.agent.name.toLowerCase() === 'ie' ) {
        rt[trait.agent.name + '/' + trait.agent.version.split('.')[0]] = true
      } else {
        rt[trait.agent.name] = true
      }
    })

    // logger.debug('Auto labors', rt)
    return Object.keys(rt)
  }
}


function isMatch(order, traitStr, labor) {
  // logger.debug('Try to match', {traitStr: traitStr, laborTrait: labor.trait})

  var requiredTrait = trait.flat(order.parsedLabors[traitStr])
  var laborTrait = trait.flat(labor.trait)

  return laborTrait.every(function(item, idx) {
    /*
     * TODO:
     *
     * need to fix a potential bug
     * 'mobile_safari'.match('safari') == true
     * this is not as expected
     */
    var item2 = requiredTrait[idx]
    if (!item2 || item.toLowerCase().indexOf(item2.toLowerCase()) === 0) {
      return true
    }
  })
}

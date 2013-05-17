'use strict';

var logger = require('./logger')
var Labor = require('./labor')
var Order = require('./order')

module.exports = {
    labors: {}, // all labors, contains freeLabors
    freeLabors: {},

    orders: {}, // all orders, contains waitingOrders
    waitingOrders: {},

    addLabor: function(socket, data) {
        var self = this
        var labor = new Labor(socket, data)
        var laborId = labor.id

        self.labors[laborId] = labor
        self.freeLabors[laborId] = labor

        labor.on('destroy', function() {
            self.removeLabor(laborId)
        })
        labor.on('busy', function() {
            delete self.freeLabors[laborId]
        })
        labor.on('free', function() {
            self.freeLabors[laborId] = labor
            self.distribute()
        })

        self.distribute()
    },

    removeLabor: function(laborId) {
        var self = this
        var labor = self.labors[laborId]
        ;delete self.labors[laborId]
        ;delete self.freeLabors[laborId]

        if (labor && Object.keys(labor.orders).length){
            // add not finished orders to self.waitingOrders to get match again
            Object.keys(labor.orders).forEach(function(orderId) {
                self.waitingOrders[orderId] = labor.orders[orderId]
            })
            self.distribute()
        }
    },

    addOrder: function(socket, data) {
        var self = this
        var order = new Order(socket, data)
        var orderId = order.id

        self.orders[orderId] = order
        self.waitingOrders[orderId] = order

        order.on('destroy', function() {
            self.removeOrder(orderId)
        })

        self.distribute()
    },

    removeOrder: function(orderId) {
        var self = this
        ;delete self.orders[orderId]
        ;delete self.waitingOrders[orderId]
    },

    /*
     * NOTE
     *
     * when this method should be triggered?
     * 1. more orders wait
     *     - new order
     *     - labor destroyed with unfinished orders
     * 2. more labors available
     *     - new labor
     *     - busy labor to be free
     *
     * so, polling is not necessary, even if there are still waiting orders
     */
    distribute: function() {
        var self = this
        var freeLabors = self.freeLabors
        var waitingOrders = self.waitingOrders

        Object.keys(waitingOrders).forEach(function(orderId) {
            var order = waitingOrders[orderId]
            var waitingBrowsers = order.waitingBrowsers
            Object.keys(waitingBrowsers).forEach(function(browser) {
                for (var i in freeLabors) {
                    var labor = freeLabors[i]
                    if (isMatch(browser, labor.ua)) {
                        order.add(labor, browser)
                        labor.add(order)
                        break
                    }
                }
            })
            if (!Object.keys(waitingBrowsers).length) {
                delete waitingOrders[orderId]
            }
        })
    },

    list: function() {
        var self = this
        var labors = self.labors
        var rt = {}
        Object.keys(labors).forEach(function(laborId){
            var labor = labors[laborId]
            var ua = labor.ua.toString()
            rt[ua] = (rt[ua] || 0) + 1
        })
        logger.debug('available browsers: ' + Object.keys(rt))
        return rt
    }
}

function isMatch(browser, ua) {
    browser = formatBrowser(browser)
    ua = formatUa(ua)
    var matched = true
    Object.keys(ua).forEach(function(k) {
        var v = ua[k]
        /*
         * TODO:
         *
         * need to fix a potential bug
         * 'mobile_safari'.match('safari') == true
         * this is not as expected
         */
        if (browser[k] && !v.toLowerCase().match(browser[k].toLowerCase())) {
            matched = false
        }
    })
    return matched
}

function formatBrowser(browser) {
    var arr = browser.split('/')
    var len = arr.length
    var obj
    // 'os/name/version'
    if (len === 3) {
        obj = {
            os: arr[0],
            name: arr[1],
            version: arr[2]
        }
    } else if (len ===2) {
        // 'name/version'
        if (arr[1].match(/^(\d+\.){0,2}\d+$/g)) {
            obj = {
                name: arr[0],
                version: arr[1]
            }
        // 'os/name'
        } else {
            obj = {
                os: arr[0],
                name: arr[1]
            }
        }
    // 'name'
    } else {
        obj = {
            name: arr[0]
        }
    }

    if (obj.name === 'ff') {
        obj.name = 'firefox'
    }

    return obj
}

function formatUa(ua) {
    return {
        os: ua.os.family,
        name: ua.family,
        version: ua.toVersion()
    }
}

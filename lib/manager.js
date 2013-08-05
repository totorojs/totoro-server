'use strict';

var logger = require('./logger')
var Labor = require('./labor')
var Order = require('./order')

var devices = require('./devices')
var groupDevices = devices.groupDevices
var deviceType = devices.deviceType

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

        labor.on('destroy', function() {
            that.removeLabor(laborId)
        })

        labor.on('busy', function() {
            delete that.availableLabors[laborId]
        })

        labor.on('free', function() {
            if (!labor.isTired) {
                that.availableLabors[laborId] = labor
                that.distribute()
            }
        })

        labor.on('tired', function() {
            delete that.availableLabors[laborId]
        })

        this.distribute()
    },

    removeLabor: function(laborId) {
        var that = this
        var labor = this.labors[laborId]

        ;delete this.labors[laborId]
        ;delete this.availableLabors[laborId]

        if (labor && Object.keys(labor.orders).length){
            // add not finished orders to this.waitingOrders to get match again
            Object.keys(labor.orders).forEach(function(orderId) {
                that.waitingOrders[orderId] = labor.orders[orderId]
            })
            this.distribute()
        }
    },

    addOrder: function(socket, data) {
        var that = this
        data.browsers = data.browsers || this.autoBrowsers()

        /*if(!data.browsers) {
            data.browsers = this.autoBrowsers()
        } else {
           data.browsers = this.filterTypeBrowsers(data.browsers)
        }*/

        var order = new Order(socket, data)
        var orderId = order.id

        this.orders[orderId] = order
        this.waitingOrders[orderId] = order

        order.on('destroy', function() {
            that.removeOrder(orderId)
        })

        this.distribute()
    },

    removeOrder: function(orderId) {
        delete this.orders[orderId]
        ;delete this.waitingOrders[orderId]
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
        var availableLabors = this.availableLabors
        var waitingOrders = this.waitingOrders

        Object.keys(waitingOrders).forEach(function(orderId) {
            var order = waitingOrders[orderId]
            var waitingBrowsers = order.waitingBrowsers
            var parsedBrowsers = order.parsedBrowsers

            Object.keys(waitingBrowsers).forEach(function(browser) {
                var parsedBrowser = parsedBrowsers[browser]
                for (var i in availableLabors) {
                    var labor = availableLabors[i]
                    if (isMatch(parsedBrowser, labor.ua)) {
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

        logger.debug('Available browsers<' + JSON.stringify(rt) + '>')
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

        logger.debug('Auto browsers<' + Object.keys(rt) + '>')
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



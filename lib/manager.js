'use strict';

var logger = require('./logger')
var Labor = require('./labor')
var Order = require('./order')


module.exports = {
    labors : {}, // all labors, contains availableLabors
    availableLabors : {},

    orders : {}, // all orders, contains waitingOrders
    waitingOrders : {},

    addLabor : function(socket, data) {
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

    removeLabor : function(laborId) {
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

    addOrder : function(socket, data) {
        var that = this

        if(!data.browsers) {
            data.browsers = this.autoBrowsers()
        }

        var order = new Order(socket, data)
        var orderId = order.id

        this.orders[orderId] = order
        this.waitingOrders[orderId] = order

        order.on('destroy', function() {
            that.removeOrder(orderId)
        })

        this.distribute()
    },

    removeOrder : function(orderId) {
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
    distribute : function() {
        var availableLabors = this.availableLabors
        var waitingOrders = this.waitingOrders

        Object.keys(waitingOrders).forEach(function(orderId) {
            var order = waitingOrders[orderId]
            var waitingBrowsers = order.waitingBrowsers
            Object.keys(waitingBrowsers).forEach(function(browser) {
                for (var i in availableLabors) {
                    var labor = availableLabors[i]
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

    _visitLabors : function(cb) {
        var labors = this.labors
        Object.keys(labors).forEach(function(laborId) {
            cb(labors[laborId])
        })
    },

    list : function() {
        var rt = {}
        this._visitLabors(function(labor) {
            var ua = labor.ua.toString()
            rt[ua] = (rt[ua] || 0) + 1
        })
        logger.debug('Available browsers<' + Object.keys(rt) + '>')
        return rt
    },

    autoBrowsers : function() {
        var rt = {}
        this._visitLabors(function(labor) {
            var ua = labor.ua
            if (ua.family.toLowerCase() === 'ie' ) {
                rt[ua.family + '/' + ua.major] = true
            } else {
                rt[ua.family] = true
            }
        })
        return Object.keys(rt)
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
            os : arr[0],
            name : arr[1],
            version : arr[2]
        }
    } else if (len ===2) {
        // 'name/version'
        if (arr[1].match(/^(\d+\.){0,2}\d+$/g)) {
            obj = {
                name : arr[0],
                version : arr[1]
            }
        // 'os/name'
        } else {
            obj = {
                os : arr[0],
                name : arr[1]
            }
        }
    // 'name'
    } else {
        obj = {
            name : arr[0]
        }
    }

    if (obj.name === 'ff') {
        obj.name = 'firefox'
    }

    return obj
}


function formatUa(ua) {
    return {
        os : ua.os.family,
        name : ua.family,
        version : ua.toVersion()
    }
}

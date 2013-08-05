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

    deviceTypeLabors: (function() {
       var deviceTypeLabors = {}
       deviceType.forEach(function(type) {
           deviceTypeLabors[type] = []
       })

       return deviceTypeLabors
    }()),

    orders: {}, // all orders, contains waitingOrders
    waitingOrders: {},

    addLabor: function(socket, data) {
        var that = this
        var labor = new Labor(socket, data)
        var laborId = labor.id

        this.labors[laborId] = labor
        this.availableLabors[laborId] = labor

        var laborType = labor.type

        this.deviceTypeLabors[laborType].push(labor)

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

        var typeLabors = this.deviceTypeLabors[labor.type]
        for(var i = 0, len = typeLabors.length; i < len; i++) {
            if (typeLabors[i].id === laborId) {
                typeLabors.splice(i, 1)
                break
            }
        }

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
        if(!data.browsers) {
            data.browsers = this.autoBrowsers()
        } else {
           data.browsers = this.filterTypeBrowsers(data.browsers)
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

    filterTypeBrowsers: function(browsers) {
        var that = this
        var bs = []
        browsers.forEach(function(bname) {
            if (deviceType.indexOf(bname) > -1) {
                bs = bs.concat(that.getBrowsersNameByType(bname))
            } else {
                bs.push(bname)
            }
        })

        return uniq(bs)
    },

    getBrowsersNameByType: function(type) {
        var labors = this.deviceTypeLabors[type]

        return uniq(labors.map(function(labor) {
            return labor.ua.browser.name
        }))
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

    list: function() {
        var deviceTypeLabors = this.deviceTypeLabors
        var typeRt = {}
        var browsers = []

        Object.keys(deviceTypeLabors).forEach(function(type) {
             var rt = {}

             deviceTypeLabors[type].forEach(function(labor) {
                 var ua = labor.ua
                 var uaStr = ua.toString()
                 rt[ua] = (rt[ua] || 0) + 1

                 if (browsers.indexOf(uaStr) < 0) {
                     browsers.push(uaStr)
                 }
             })

             if (Object.keys(rt).length > 0) {
                 typeRt[type] = rt
             }
        })

        logger.debug('Available browsers<' + browsers + '>')
        return typeRt
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

        return Object.keys(rt)
    }
}


function isMatch(browser, ua) {
    browser = formatBrowser(browser)
    ua = formatUa(ua)

    var matched = true
    ua.forEach(function(item, idx){
        /*
         * TODO:
         *
         * need to fix a potential bug
         * 'mobile_safari'.match('safari') == true
         * this is not as expected
         */
        if (browser[idx] && !item.toLowerCase().match(browser[idx].toLowerCase())) {
            matched = false
        }
    })
    return matched
}


var versionReg = /\/(\d+\.)*\d+$/g
var singleSlashReg = /^[^/]*\/[^/]*$/g

function formatBrowser(browser) {
    if(!browser.match(versionReg)) {
        browser = browser + '/'
    }
    if(browser.match(singleSlashReg)) {
        browser = '/' + browser
    }
    logger.debug('Format browser<' + browser +'>')
    return browser.split('/')
}


function formatUa(ua) {
    return [ua.os.name, ua.browser.name, ua.browser.fullVersion]
}

function uniq(arr) {
    var obj = {}

    return arr.filter(function(item) {
        if (obj[item]) return false
        return (obj[item] = true)
    })
}

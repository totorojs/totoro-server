'use strict';

// Retrieve
var fs = require('fs')
var when = require('when')
var async = require('async')
var util = require('util')
var path = require('path')
var dateFormat = require('dateformat')
var common = require('totoro-common')
var logger = require('totoro-logger')

var defaultCfg = {
    dbHost: '10.15.52.87',
    dbPort: '27017',
    dbName: 'test3',
    dbTimeout: 2000
}

var OrderBeginReg = /New order\s+(\{.*\})$/
var OrderEndReg = /Order destroys\s+(\{.*\})$/

function getCfg() {
    var projectCfg = common.readCfgFile('totoro-server-config.json')
    return common.mix(projectCfg, defaultCfg)
}

function OrderResult(line) {
    this.initOrder(line)
    this.defer = when.defer()
}

OrderResult.prototype = {
    initOrder: function(line) {
        var that = this
        var match = line.match(OrderBeginReg)
        var orderInfo = JSON.parse(match[1])

        this.orderId = orderInfo.orderId
        var cfg = orderInfo.config || {}

        this.repo = cfg.repo

        this.coverage = 0
        this.duration = 0
        this.tc = 0
        this.succBrowsers = 0
    },

    update: function(orderInfo) {
        this.labors = orderInfo.labors
        this.totalTime = parseInt(orderInfo.duration, 10)
        var logs = orderInfo.logs
        this.error = logs.error

        if (logs.error.length > 0) {
            this.endParse()
            return
        }

        this.updateOverviewInfo()

        this.endParse()
    },

    updateOverviewInfo: function() {
        var that = this
        var labors = this.labors

        Object.keys(labors).forEach(function(laborName) {
            var laborInfo = labors[laborName]
            var stats = laborInfo.stats
            var coverage = stats.coverage || {}

            if (coverage.missesDetail) {
                delete coverage.missesDetail
            }

            if (laborInfo.failures.length === 0 && !stats.error) {
                that.succBrowsers++
                that.coverage = that.coverage + (coverage && coverage.coverage || 0)
                that.duration = that.duration + stats.duration
                that.tc = that.tc + stats.tests
            }
        })
    },

    endParse: function() {
        this.defer.resolve({
            date: getNow(),
            orderId: this.orderId,
            repo: this.repo,
            errorList: this.error,
            labors: this.labors,
            succ: this.isSucc(),
            totalTime: this.totalTime,
            coverage: this.coverage && (this.coverage / this.succBrowsers),
            averageDuration: this.duration && (this.duration / this.succBrowsers),
            tc: this.tc && (this.tc / this.succBrowsers)
        })
    },

    isSucc: function() {
        var labors = this.labors
        if (this.error.length > 0) return false

        return Object.keys(labors).every(function(name) {
            var b = labors[name]
            return !b.stats.error && (b.failures.length === 0)
        })
    },

    end: function(callback) {
        this.defer.promise.then(callback)
    }
}

function MongoLog(cfg) {
    var that = this
    this.cfg = cfg
    this.repoInfoUpdateQueue = async.queue(function(log, callback) {
        var orderId = log.orderId
        var repo = log.repo
        var isSucc = isSuccOrder(log)
        var RepoInfoModel = that.cfg.schemas['RepoInfo']

        RepoInfoModel.findOne({repo: repo}, function(err, repoInfo) {
            // console.info('save repoInfo model', repoInfo)
            if (!repoInfo) {
                var repoInfoModel = new RepoInfoModel({
                    repo: repo,
                    orderList: [orderId],
                    isSucc: isSucc,
                    updateDate: getDateById(log._id)
                })
                repoInfoModel.save(callback)
            } else {
                if (repoInfo.orderList.indexOf(orderId) < 0) {
                    repoInfo.orderList.push(orderId)
                    repoInfo.isSucc = isSucc
                    repoInfo.updateDate = getDateById(log._id)
                }
                repoInfo.save(callback)
            }
        })
    }, 1)
}

function getDateById(id) {
    return new Date(parseInt((id+'').slice(0,8), 16)*1000)
}

MongoLog.prototype = {
    appendLog: function(log) {
        var that = this
        var LogModel = this.cfg.schemas['Log']

        filterOrderLabor(log)

        var logModel = new LogModel(log)

        logModel.save(function(err, log) {
            if (err) {
                console.warn('save log error | ' + err)
            } else {
                that.updateRepoInfo(log)
            }
        })
    },

    // update the test run information
    updateRepoInfo: function(log) {
        this.repoInfoUpdateQueue.push(log)
    }
}

function filterOrderLabor(order) {
    var labors = order.labors || {}

    Object.keys(labors).forEach(function(labor) {
        if (/\./.test(labor)) {
            labors[labor.replace(/\./g, '_')] = labors[labor]
            delete labors[labor]
        }
    })
}

function isSuccOrder(order) {
    var labors = order.labors
    var bIds = Object.keys(labors)
    var errMsg = []

    var succ = true

    //TODO distinguish cancel or error ?
    if (!order.totalTime) {
        succ = false
    } else {
        bIds.forEach(function(bId) {
            var testResult = labors[bId]
            var stats = testResult.stats

            if (stats.error || testResult.failures.length) {
                succ = false
            }

            if (stats.duration < 0) {
                succ = false
            }
        })
    }

    return succ
}


function getNow() {
    return dateFormat(new Date(), 'yyyymmdd')
}

var BrowserSchema = {
    ua: {type: String},
    coverge: {type: Object},
    duration: {type: Number},
    failures: {type: Number},
    pending: {type: Number},
    passed: {type: Number},
    tests: {type: Number},
    suites: {type: Number}
}

var LogSchema = {
    date: {type: String},
    repo: {type: String},
    orderId: {type: String},
    errorList: {type: Array},
    labors: {type: Object},
    succ: {type: Boolean},
    totalTime: {type: Number},
    coverage: {type: Number},
    averageDuration: {type: Number},
    tc: {type:Number}
}

var RepoInfoSchema = {
    repo: {type: String},
    orderList: {type: Array},
    isSucc: {type: Boolean},
    updateDate: {type: Date}
}


module.exports = function() {
    var orders = []
    var log

    function addOrder(order) {
        log.appendLog(order)
    }

    function delOrder(orderId) {
        for (var i = 0, len = orders.length; i < len; i++) {
            if (orders[i].orderId === orderId) {
                orders.splice(i, 1)
                return
            }
        }
    }

    function parse(line) {
        if (OrderBeginReg.test(line)) {
            var order = new OrderResult(line)

            order.end(function(orderInfo) {
                addOrder(orderInfo)
                delOrder(orderInfo.orderId)
            })

            orders.push(order)
        } else if (OrderEndReg.test(line)) {
            var match = line.match(OrderEndReg)
            var orderInfo = JSON.parse(match[1])

            orders.some(function(order) {
                if (order.orderId === orderInfo.orderId) {
                    order.update(orderInfo)
                    return true
                }
            })
        }
    }

    return {
        getTransport: function() {
            var cfg = getCfg()

            cfg.parse = parse

            cfg.schemas = {
                Log: LogSchema,
                RepoInfo: RepoInfoSchema
            }

            log = new MongoLog(cfg)

            return logger.getMongoTransport(cfg)
        }
    }
}

'use strict';

// Retrieve
var fs = require('fs')
var when = require('when')
var util = require('util')
var path = require('path')
var dateFormat = require('dateformat')
var common = require('totoro-common')
var logger = common.logger
var Transport = logger.Transport

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var defaultCfg = {
    dbHost: '10.15.52.87',
    dbPort: '27017',
    dbName: 'test',
    dbTimeout: 2000
}

function getCfg() {
    var projectCfg = common.readCfgFile('totoro-server-config.json')
    return common.mix(projectCfg, defaultCfg)
}

module.exports = function() {

    var deferred = when.defer()
    var promise = deferred.promise
    var mongoLog = new MongoLog()

    mongoLog.get().then(function() {
        deferred.resolve(mongoLog)
    }, function() {
        console.info('To enable the local file service!')
        var fileLog = new FileLog()
        deferred.resolve(fileLog)
    })

    function addOrder(order) {
       promise.then(function(log) {
           log.appendLog(order)
       })
    }

    var orders = []

    function parse(line) {
        if (OrderBeginReg.test(line)) {
            var order = new OrderResult(line)
            order.end(function(orderInfo) {
                addOrder(orderInfo)
                delOrder(orderInfo.orderId)
            })

            orders.push(order)
        } else if (LaborReg.test(line)) {
            addLabor(line)
        } else {
            orders.some(function(order) {
                return order.parse(line)
            })
        }
    }

    function delOrder(orderId) {
        for (var i = 0, len = orders.length; i < len; i++) {
            if (orders[i].orderId === orderId) {
                orders.splice(i, 1)
                return
            }
        }
    }

    return {
        getTransport: function() {
            var mongoTransport = new Transport()
            mongoTransport.transport = function(data) {
                parse(data.message)
            }
            return mongoTransport
        }
    }
}


var LaborMapping = {
}

function addLabor(line) {
    var match = line.match(LaborReg)
    var uaInfo = match[2].split('/')
    var browsersInfo = uaInfo[0].split(' ')

    LaborMapping[match[1]] = {
        name: browsersInfo[0].trim(),
        version: browsersInfo[1].trim(),
        os: uaInfo[1]
    }
}


var OrderBeginReg = /New order<([\w_-]+)>[^<]+<([^>]+)>$/
var LaborReg = /New labor<([\w_-]+)>, UA<([^>]+)>$/


// TODO dynamic adding reg rules?
function OrderResult(line) {
    this.initOrder(line)
    this.defer = when.defer()
}

OrderResult.prototype = {
    initOrder: function(line) {

        var that = this
        var match = line.match(OrderBeginReg)
        var orderInfo = JSON.parse(match[2])

        var orderId = this.orderId = match[1]
        this.repo = orderInfo.repo

        if (orderInfo.browsers) {
            this.browsers = {}
            /**
            orderInfo.browsers.forEach(function(b) {
                that.browsers[b] = {}
            })
            **/
        }

        this.orderReg = new RegExp(orderId)
        this.orderLaborReg = new RegExp('Order<' + orderId + '>, browsers<[^>]+> add labor<([^>]+)>')
        this.laborReg = new RegExp('Labor<([\\w-]+)> finished order<' + orderId + '>, result<([^>]+)>$')
        this.totalTimeReg = new RegExp('All labors finished order<' + orderId + '>, total time<(\\d+)>')
        this.endReg = new RegExp('Order<' + orderId + '> destroy.$')

        this.coverage = 0
        this.duration = 0
        this.tc = 0
        this.succBrowsers = 0
    },

    parse: function(line) {
        if (!this.orderReg.test(line)) {
            return false
        }

        // subsequent processing
        if (this.laborReg.test(line)) {
            this.addLabor(line)
        } else if (this.orderLaborReg.test(line)) {
            this.updateLabor(line)
        } else if (this.totalTimeReg.test(line)) {
            this.addTotalTime(line)
        } else if (this.endReg.test(line)) {
            // end parse
            this.endParse()
        }

        return true
    },

    addLabor: function(line) {
        var match = line.match(this.laborReg)
        var uaInfo = LaborMapping[match[1]]
        var bInfo = this.browsers[match[1]] = JSON.parse(match[2])
        bInfo.ua = uaInfo

        if (bInfo.error) return

        this.succBrowsers++

        this.coverage = this.coverage + (bInfo.coverage && bInfo.coverage.coverage || 0)
        this.duration = this.duration + bInfo.duration
        this.tc = this.tc + bInfo.tests
    },

    updateLabor: function(line) {
        var match = line.match(this.orderLaborReg)
        var laborId = match[1]
        this.browsers[laborId] = this.browsers[laborId] || {}
    },

    addTotalTime: function(line) {
        var match = line.match(this.totalTimeReg)
        this.totalTime = parseInt(match[1], 10)
    },

    endParse: function() {
        this.defer.resolve({
            date: getNow(),
            orderId: this.orderId,
            repo: this.repo,
            browsers: this.browsers,
            succ: this.isSucc(),
            totalTime: this.totalTime,
            coverage: this.coverage / this.succBrowsers,
            averageDuration: this.duration / this.succBrowsers,
            tc: this.tc / this.succBrowsers
        })
    },

    isSucc: function() {
        var browsers = this.browsers
        return Object.keys(browsers).every(function(name) {
            var b = browsers[name]
            if (b.error) return false
            return b && (b.failures === 0)
        })
    },

    end: function(callback) {
        this.defer.promise.then(callback)
    }
}

function MongoLog(cfg) {
    cfg = getCfg()
    var that = this
    var defer = when.defer()
    this.promise = defer.promise

    var BrowserSchema = new Schema({
        ua: {type: String},
        coverge: {type: Object},
        duration: {type: Number},
        failures: {type: Number},
        pending: {type: Number},
        passed: {type: Number},
        tests: {type: Number},
        suites: {type: Number}
    })

    var LogSchema = new Schema({
        date: {type: String},
        repo: {type: String},
        orderId: {type: String},
        browsers: {type: Object},
        totalTime: {type: Number},
        coverage: {type: Number},
        averageDuration: {type: Number},
        tc: {type:Number}
    })


    var db = mongoose.connect('mongodb://' + cfg.dbHost + ':' + cfg.dbPort + '/' + cfg.dbName, {
        server: {
            socketOptions: {
                connectTimeoutMS: cfg.dbTimeout
            }
        }
    })

    var Log = db.model('Log', LogSchema)


    db.connection.on('error', function() {
        defer.reject()
    })

    db.connection.once('open', function() {
        that.LogModel = Log
        defer.resolve()
    })
}

MongoLog.prototype = {
    appendLog: function(log) {
        var that = this
        var logModel = new this.LogModel(log)

        logModel.save(function(err) {
            if (err) {
                logger.warn('save log error | ' + JSON.stringify(log))
            }
        })
    },
    get: function(cb) {
        return this.promise
    }
}

function getNow() {
    return dateFormat(new Date(), 'yyyymmdd')
}

function FileLog() {
    var that = this
    var now = getNow()
    var filePath = path.join('logs', now + '.json')

    if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath))
    }

    this.stream = fs.createWriteStream(filePath, {
        flags: 'a',
        encoding: 'utf8'
    })

    process.on('exit', function() {
        that.destroy()
    })
}

FileLog.prototype.appendLog = function(order) {
    console.info('file appendLog')
    var str = JSON.stringify(order)
    this.stream.write(str + '\n');
    this.stream.write('===========' + '\n')
}

FileLog.prototype.destroy = function() {
    if (this.stream) {
        this.stream.end()
        this.stream.destroySoon()
        this.stream = null
    }
}

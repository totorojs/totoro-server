'use strict';

// Retrieve
var fs = require('fs')
var when = require('when')
var util = require('util')
var path = require('path')
var dateFormat = require('dateformat')
var logger = require('totoro-common').logger
var Transport = logger.Transport

var mongoose = require('mongoose')
var Schema = mongoose.Schema


module.exports = function(cfg, callback) {
    var deferred = when.defer()
    var promise = deferred.promise
    var mongoLog = new MongoLog(cfg)

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
    LaborMapping[match[1]] = {
        name: match[2].split(' ')[0],
        source: match[2]
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
            orderInfo.browsers.forEach(function(b) {
                that.browsers[b] = {}
            })
        }

        this.orderReg = new RegExp(orderId)
        this.laborReg = new RegExp('Labor<([\\w-]+)> finished order<' + orderId + '>, result<([^>]+)>$')
        this.totalTimeReg = new RegExp('All labors finished order<' + orderId + '>, total time<(\\d+)>')
        this.endReg = new RegExp('Order<' + orderId + '> destroy.$')

        this.coverage = 0
        this.duration = 0
        this.tc = 0
    },

    parse: function(line) {
        if (!this.orderReg.test(line)) {
            return false
        }

        // subsequent processing
        if (this.laborReg.test(line)) {
            this.addLabor(line)
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
        var bName = LaborMapping[match[1]].name
        var bInfo = this.browsers[bName] = JSON.parse(match[2])

        this.coverage = this.coverage + (bInfo.coverage && bInfo.coverage.coverage || 0)
        this.duration = this.duration + bInfo.duration
        this.tc = this.tc + bInfo.tests
    },

    addTotalTime: function(line) {
        var match = line.match(this.totalTimeReg)
        this.totalTime = parseInt(match[1], 10)
    },

    endParse: function() {
        var bLen = Object.keys(this.browsers).length
        this.defer.resolve({
            _date: getNow(),
            orderId: this.orderId,
            repo: this.repo,
            browsers: this.browsers,
            succ: this.isSucc(),
            totalTime: this.totalTime,
            coverage: this.coverage / bLen,
            averageDuration: this.duration / bLen,
            tc: this.tc / bLen
        })
    },

    isSucc: function() {
        var browsers = this.browsers
        return Object.keys(browsers).every(function(name) {
            var b = browsers[name]
            return b && (b.failures === 0)
        })
    },

    end: function(callback) {
        this.defer.promise.then(callback)
    }
}

function MongoLog(cfg) {
    var that = this
    var defer = when.defer()
    this.promise = defer.promise

    var LogSchema = new Schema({
        _date: {type : String},
        repo: {type: String},
        orderId: {type : String},
        browsers: {type: Object},
        succ: {type: Boolean},
        totalTime: {type: Number},
        coverage: {type: Number},
        averageDuration: {type: Number},
        tc: {type:Number}
    })


    var db = mongoose.connect('mongodb://' + cfg.serverHost + ':27017/' + cfg.db, {
        server: {
            socketOptions: {
                connectTimeoutMS: 2000
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
                console.info('save err')
            } else {
                console.log('save success')
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

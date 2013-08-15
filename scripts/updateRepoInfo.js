var MongoLog = require('../lib/log-server').MongoLog


var mongoLog = new MongoLog()

mongoLog.get().then(function() {
    var LogModel = mongoLog.LogModel
    LogModel.find({}, function(err, logs) {
        logs.forEach(function(log, i) {
            mongoLog.updateRepoInfo(log)
        })
    })
})


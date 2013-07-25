var logger = require('totoro-common').logger

var loggerServer = require('./log-server')({
    serverHost: '10.15.52.87',
    db: 'test'
})

var Transport = logger.Transport

var mongoTransport = new Transport({})

mongoTransport.transport = function(data) {
    loggerServer.log(data.message)
}

module.exports =  logger.getLog({
    transports: [mongoTransport]
})


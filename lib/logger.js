var logger = require('totoro-common').logger
var fileTransport = logger.getFileTransport()

// TODO config server host
var mongoTransport = require('./log-server')().getTransport()

module.exports = logger.getLog({
    transports: [fileTransport, mongoTransport]
})


var logger = require('totoro-common').logger
var fileTransport = logger.getFileTransport()

// TODO config server host
var mongoTransport = require('./log-server')({
    serverHost: '10.15.52.87',
    db: 'test'
}).getTransport()

module.exports = logger.getLog({
    transports: [fileTransport, mongoTransport]
})


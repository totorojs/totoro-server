var logger = require('totoro-logger')
var fileTransport = logger.getFileTransport()

module.exports = logger.getLog({
    transports: [fileTransport]
})


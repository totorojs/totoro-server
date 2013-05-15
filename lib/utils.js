'use strict';

var fs = require('fs')
var request = require('request')
var logger = require('./logger')

var urlReg = /^https?:\/\//
exports.isUrl = function(url) {
    return urlReg.test(url)
}

exports.getUrl = function(url, callback) {
    request(url, function(err, res, body) {
        if (err) {
            logger.warn('fetch url ' + url + ' error!')
        }
        callback(err, body || '')
    })
}

exports.isExistedFile = function(p) {
    return p && fs.existsSync(p) && fs.statSync(p).isFile()
}

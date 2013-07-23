'use strict';

var common = require('totoro-common')
var logger = common.logger

var defaultAdapters = getDefaultAdapters()
var adapterReg = new RegExp('<script.*?(' +
        defaultAdapters.join('|') +
        ').*?>.*?<\/script>', 'ig' )


module.exports = adapt


function adapt(id, content, adapter) {
    if (!adapter) {
        adapter = guessAdapter(content)
        if (adapter) {
            logger.debug('Found adapter<' + adapter + '>')
        } else {
            return {
                success : false,
                msg : 'Can not guess which adapter should be used, "' +
                        'please choose one of "' + defaultAdapters +
                        '" or apply your own adapter.'
            }
        }
    } else if (common.isKeyword(adapter)) {
        if (defaultAdapters.indexOf(adapter.toLowerCase()) === -1) {
            return {
                success : false,
                msg : 'Specified adapter<' + adapter + '> is not available, ' +
                        'please choose one of "' + defaultAdapters +
                        '" or apply your own adapter.'
            }
        }
    }

    var insertPos = getInsertPos(content, adapter)
    if(!insertPos) {
        return {
            success : false,
            msg : 'Can not decide where to insert adapter.'
        }
    }

    var src
    if (common.isUrl(adapter)) {
        src = adapater
    } else if (common.isKeyword(adapter)) {
        src = '/adapters/' + adapter + '.js'
    } else {
        src = '/runner/' + id + '/' + adapter
    }

    return {
        success : true,
        content : content.substring(0, insertPos) +
                '<script src="' + src + '"></script>' +
                '<script src="/adapters/onerror.js"></script>' +
                content.substring(insertPos)
    }
}


function guessAdapter(content) {
    var adapter
    var matched
    while((matched = adapterReg.exec(content)) !== null) {
        logger.debug('Found test framework script<' + matched[0] + '>' )
        adapter = matched[1]
    }
    return adapter
}


function getInsertPos(content, adapter) {
    var pos
    var matched
    if (common.isKeyword) {
        var reg = new RegExp('<script.*?' + adapter + '.*?>.*?<\/script>', 'ig' )
        while((matched = reg.exec(content)) !== null) {
            pos = matched.index +  matched[0].length
        }
    } else {
        matched = content.match(/<\/head>/i)
        if (matched) {
            pos = matched.index
        }
    }
    return pos
}


function getDefaultAdapters() {
    // TODO when third adpter added
    return ['mocha', 'jasmine']
}


'use strict';

var common = require('totoro-common')

var defaultAdapters = getDefaultAdapters()
var adapterReg = new RegExp('<script[\\s\\S]*?(' +
        defaultAdapters.join('|') +
        ')[\\s\\S]*?>[\\s]*?<\/script>', 'ig' );


module.exports = adapt


function adapt(id, content, adapter) {
    if (!adapter) {
        adapter = guessAdapter(content)
        if (!adapter) {
            return new Error('Can not guess which adapter should be used, ' +
                    'please choose one of "' + defaultAdapters +
                    '" or apply your own adapter.')
        }
    } else if (common.isKeyword(adapter)) {
        if (defaultAdapters.indexOf(adapter.toLowerCase()) === -1) {
            return new Error('Specified adapter "' + adapter + '" is not available, ' +
                    'please choose one of "' + defaultAdapters +
                    '" or apply your own adapter.')
        }
    }

    var insertPos = getInsertPos(content, adapter)
    if(!insertPos) {
        return new Error('Can not decide where to insert adapter.')
    }

    var src
    if (common.isUrl(adapter)) {
        src = adapter
    } else if (common.isKeyword(adapter)) {
        src = '/adapters/' + adapter + '.js'
    } else {
        src = '/runner/' + id + '/' + adapter
    }

    return content.substring(0, insertPos) +
            '<script src="/adapters/totoro.js"></script>' +
            '<script src="' + src + '"></script>' +
            content.substring(insertPos)
}


function guessAdapter(content) {
    var adapter
    var matched
    while((matched = adapterReg.exec(content)) !== null) {
        adapter = matched[1]
    }
    return adapter
}


function getInsertPos(content, adapter) {
    var pos
    var matched

    if (common.isKeyword(adapter)) {
        var reg = new RegExp('<script[\\s\\S]*?' + adapter + '[\\s\\S]*?>[\\s]*?<\/script>', 'ig' )
        while((matched = reg.exec(content)) !== null) {
            pos = matched.index +  matched[0].length
        }
    }

    // if specified a keyword, but not found the corresponding test framework script tag
    // adapter will be inserted before </head>
    if (!pos) {
        matched = content.match(/<\/head>/i)
        if (matched) {
            pos = matched.index
        }
    }

    return pos
}


function getDefaultAdapters() {
    // TODO when third adapter added
    return ['mocha', 'jasmine']
}


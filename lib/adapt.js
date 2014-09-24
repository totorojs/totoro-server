'use strict';

var utilx = require('utilx')
var path = require('path')
var fs = require('fs')

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
  } else if (utilx.isKeyword(adapter)) {
    if (defaultAdapters.indexOf(adapter) === -1 && adapter !== 'no') {
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
  if (utilx.isUrl(adapter)) {
    src = adapter.replace(/https?:\/\/[^\/]+/, '')
  } else if (utilx.isKeyword(adapter)) {
    src = '/__static/adapters/' + adapter + '.js'
  } else {
    src = path.join('/', adapter)
  }

  return content.substring(0, insertPos) +
    '<script src="/__static/json2.js"></script>' +
    '<script src="/__static/totoro.js"></script>' +
    (adapter === 'no' ? '' : '<script src="' + src + '"></script>') +
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

  if (utilx.isKeyword(adapter)) {
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
  var adapterPath = path.join(__dirname, '..', 'static', 'adapters')
  return fs.readdirSync(adapterPath).filter(function(filename) {
    return (/\.js$/).test(filename)
  }).map(function(adapterFile) {
    return adapterFile.replace(/\.js$/, '');
  })
}


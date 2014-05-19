(function() {
  function isType(type) {
    return function(obj) {
      return {}.toString.call(obj) == '[object ' + type + ']'
    }
  }
  var isObject = isType("Object")
  var isFunction = isType("Function")
  var isArray = Array.isArray || isType("Array")

  var orderId = location.href.match(/(?:\?|&)?__totoro_oid=([^&#]+)/)[1]
  var laborId = location.href.match(/(?:\?|&)?__totoro_lid=([^&#]+)/)[1]

  var result = {
    erros: [],
    customLogs: [],
    failures: [],
    status: undefined
  }

  function send(action, info) {
    var data = {
      action: action,
      orderId: orderId,
      laborId: laborId,
      info: info
    }
    $.post('/__report', clean(data))
  }


  function clean(obj) {
    if (!obj || !obj.toString) return obj

    var rt
    if (isObject(obj)) {
      rt = {}
      for (var i in obj) {
        rt[i] = clean(obj[i])
      }

    } else if (isArray(obj)) {
      rt = []
      for (var i = 0; i < obj.length; i++) {
        rt.push(clean(obj[i]))
      }

    } else if (isFunction(obj)) {
      rt = obj.toString()

    } else if (obj.nodeName && obj.nodeType) {
      rt =  '<' +
        obj.nodeName.toLowerCase() +
        (obj.id ? ' id="' + obj.id + '"': '') +
        (obj.className ? ' class="' + obj.className + '"' : '') +
        ' />'

    } else {
      rt = obj
    }

    return rt
  }


  window.totoro = {
    report: function(data) {
      // backward compatible
      delete data.orderId

      var action = data.action
      var info = data.info

      switch (action) {
        case 'onerror':
          result.errors.push(info)
          break
        case 'log':
          result.customLogs.push(info)
          break
        case 'fail':
          result.failures.push(info)
          break
        case 'end':
          if (_$jscoverage) {
            var cov = map(_$jscoverage)
            ;delete cov.files
            info.coverage = cov
          }
          result.stats = info
          send('end', info)
          break
        default:
          break
      }
    },

    // PRIVATE
    end: function() {
      totoro.report({
        action: 'end',
        info: {}
      })
    },

    // NO USE, keep for backward compatibility
    getOrderId: function() {return ''},
  }


  // rewrite console
  if ( typeof console === 'undefined') console = {}
  console.log = function() {
    totoro.report({
      action: 'log',
      info: [].slice.call(arguments, 0)
    })
  }


  window.alert = function(){}
  window.confirm = function(){return false}
  window.prompt = function(){return null}


  window.onerror = function(message, url, line){
    totoro.report({
      action: 'onerror',
      info: {
        message: message,
        url: url,
        line: line
      }
    })
    return true
  }


  // the following code base on
  // https://github.com/visionmedia/mocha/blob/master/lib/reporters/json-cov.js

  /**
   * Map jscoverage data to a JSON structure
   * suitable for reporting.
   *
   * @param {Object} cov
   * @return {Object}
   * @api private
   */
  function map(cov, verbose) {
    var ret = {
      sloc: 0,
      hits: 0,
      misses: 0,
      coverage: 0,
      files: []
    }

    var missesDetail = {}

    for (var filename in cov) {
      var data = coverage(filename, cov[filename])
      ret.files.push(data)
      ret.hits += data.hits

      if (data.misses.length) {
        missesDetail[filename] = data.misses
      }

      ret.misses += data.misses.length
      ret.sloc += data.sloc
    }

    ret.files.sort(function(a, b) {
      return a.filename.localeCompare(b.filename)
    });

    if (ret.sloc > 0) {
      ret.coverage = (ret.hits / ret.sloc) * 100

      ret['missesDetail'] = missesDetail
    }

    return ret
  }

  /**
   * Map jscoverage data for a single source file
   * to a JSON structure suitable for reporting.
   *
   * @param {String} filename name of the source file
   * @param {Object} data jscoverage coverage data
   * @return {Object}
   * @api private
   */
  function coverage(filename, data) {
    var ret = {
      filename: filename,
      coverage: 0,
      hits: 0,
      misses: [],
      sloc: 0,
      source: {}
    };

    for (var i = 0; i < data.source.length; i++) {
      var num = i
      var line = data.source[i]

      num++

      if (data[num] === 0) {
        ret.misses.push(num)
        ret.sloc++
      } else if (data[num] !== undefined) {
        ret.hits++
        ret.sloc++
      }

      ret.source[num] = {
        source: line,
        coverage: data[num] === undefined ? '' : data[num]
      }
    }

    ret.coverage = ret.hits / ret.sloc * 100

    return ret
  }

})()







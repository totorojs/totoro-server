(function() {
  var orderId = location.href.match(/(?:\?|&)?__totoro_oid=([^&#]+)/)[1]
  var laborId = location.href.match(/(?:\?|&)?__totoro_lid=([^&#]+)/)[1]

  var report = {
    customLogs: [],
    errors: [],
    failures: [],
    status: undefined
  }


  /*
   * deep clone data from crossed window, not orthodox
   * see #33, #45, docs/type-checking
   */
  function clone(obj) {
    if (obj && obj.toString) {
      var isPlainObj
      var fnReg = /^function[^\(]*\([^\)]*\)/
      var fnMatched
      var objstr = obj.toString()

      // plain object or array
      /*
       * NOTE
       * must decide if obj is an array, because:
       * [{...}].toString() -> [object Object]
       */
      if (obj.length >= 0 && obj.splice || objstr === '[object Object]') {
        var rt = obj.length >= 0 && obj.splice ? [] : {}
        for (var i in obj) {
          rt[i] = clone(obj[i])
        }
        return rt
      // function
      } else if (obj.prototype && (fnMatched = objstr.match(fnReg))) {
        return fnMatched[0] + ' {...}'
      // DOM
      } else if (obj.nodeName && obj.nodeType) {
        return '<' +
          obj.nodeName.toLowerCase() +
          (obj.id ? ' id="' + obj.id + '"': '') +
          (obj.className ? ' class="' + obj.className + '"' : '') +
          ' />'
      } else {
        return objstr
      }
    } else {
      return obj
    }
  }


  window.totoro = {
    report: function(data) {
      // backward compatible
      delete data.orderId

      var action = data.action
      var info = data.info

      switch (action) {
        case 'log':
          report.customLogs.push(info)
          break
        case 'onerror':
          report.errors.push(info)
          break
        case 'pass':
          break
        case 'pending':
          break
        case 'fail':
          report.failures.push(info)
          break
        case 'end':
          if (_$jscoverage) {
            var cov = map(_$jscoverage)
            ;delete cov.files
            info.coverage = cov
          }
          report.stats = info
          console.info(report)
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







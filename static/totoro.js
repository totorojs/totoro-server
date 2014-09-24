(function() {
  var orderId = location.href.match(/(?:\?|&)?__totoro_oid=([^&#]+)/)[1]
  var laborId = location.href.match(/(?:\?|&)?__totoro_lid=([^&#]+)/)[1]

  var result = {
    errors: [],
    customLogs: [],
    failures: [],
    status: undefined
  }

  var ajax = (function() {
    var createXHR = function() {
      try {
        return new window.XMLHttpRequest();
      } catch (e) {
        return new window.ActiveXObject('Microsoft.XMLHTTP');
      }
    }

    return function(config) {
      config.type = (config.type || 'GET').toUpperCase()

      var xhr = createXHR();

      xhr.open(config.type, config.url, true);

      if (config.type === 'POST') {
        xhr.setRequestHeader('Content-Type',
          config.contentType || 'application/x-www-form-urlencoded');
      }

      xhr.send(config.data || null);

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          config.onSuccess && config.onSuccess(xhr.responseText)
        }
      }
    }
  })();

  function send(action, info) {
    var data = {
      action: action,
      orderId: orderId,
      laborId: laborId,
      info: info
    }

    ajax({
      type: 'POST',
      url: '/__report',
      data: JSON.stringify(clean(data)),
      contentType: 'application/json'
    })
  }


  window.totoro = {
    report: function(data) {
      var action = data.action
      var info = data.info

      switch (action) {
        case 'onerror':
          result.errors.push(info)
          // report the first error so that
          // if test is interrupted user will see this error
          if (result.errors.length === 1) {
            send('onerror', {errors: result.errors})
          }
          break
        case 'log':
          result.customLogs.push(info)
          break
        case 'fail':
          result.failures.push(info)
          break
        case 'end':
          if (typeof _$jscoverage !== 'undefined') {
            var cov = map(_$jscoverage)
            ;delete cov.files
            info.coverage = cov
          }
          result.stats = info
          send('end', result)
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
    }
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


  function isType(type) {
    return function(obj) {
      return {}.toString.call(obj) === '[object ' + type + ']'
    }
  }
  var isObject = isType('Object')
  var isFunction = isType('Function')
  var isArray = Array.isArray || isType('Array')


    // convert DOM and function to string
  function clean(obj) {
    if (!obj || !obj.toString) return obj

    var rt,i
    if (isObject(obj)) {
      rt = {}
      for (i in obj) {
        rt[i] = clean(obj[i])
      }

    } else if (isArray(obj)) {
      rt = []
      for (i = 0; i < obj.length; i++) {
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
  function map(cov) {
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

      // ret['missesDetail'] = missesDetail
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







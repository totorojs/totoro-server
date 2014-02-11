(function() {
  if ( typeof console === 'undefined') {
    console = {
      log: function(msg) {
        var el = document.createElement('div')
        el.innerHTML = msg
        document.body.appendChild(el)

        setTimeout(function() {
          document.body.removeChild(el)
        }, 300000)
      }
    }
  }

  function Labor() {
    this.orders = {}
    this.reports = []
    this.timer = undefined
    this.init()
  }


  Labor.prototype.init = function() {
    var that = this
    var socket = this.socket = io.connect('/labor')

    socket.on('connect', function() {
      console.log('connected')
      socket.emit('init', {
        ua: navigator.userAgent
      })
    })

    socket.on('ping', function() {
      clearInterval(that.timer)
    })

    socket.on('add', function(data) {
      that.add(data)
    })

    socket.on('remove', function(orderId) {
      that.remove(orderId)
    })

    socket.on('disconnect', function() {
      console.log('disconnected')
      for (var i in that.orders) {
        that.remove(i)
      }
      that.timer = setInterval(function() {
        that.socket.emit('ping')
      }, 950)
    })

    setInterval(function() {
      if (that.reports.length) {
        var data = that.reports
        that.reports = []
        that.socket.emit('report', data)
      }
    }, 1000)
  }

  Labor.prototype.add = function(data) {
    var orderId = data.orderId
    var path = data.href.replace(/https?\:\/\/[^/]+?\//, '/')
    var src = '/runner/' + data.orderId + path
    var element

    if (data.uaGroup === 'mobile') {
      element = document.createElement('iframe')
      element.src = src
      document.body.appendChild(element)
    } else {
      element = window.open(src, 'totoro_' + (new Date()).getTime(), 'top=100,left=200,width=800,height=600')
    }

    this.orders[orderId] = element
    this.orders[orderId].verbose = data.verbose

    console.log('add order: ' + src)
  }

  Labor.prototype.remove = function(orderId) {
    var element = this.orders[orderId]

    if (element) {
      delete this.orders[orderId]

      if (element.nodeName) {
        document.body.removeChild(element)
      } else {
        element.close()
      }

      console.log('remove order: ' + orderId)
    }
  }


  var labor = new Labor()


  window.totoro = {
    report: function(data) {
      data = clone(data)

      if (data.action === 'end') {
        var orderId = data.orderId
        console.log('finish order: ' + orderId)


        if (!(data.info && data.info.error)) {
          var element = labor.orders[orderId]
          var verbose = element.verbose

          var jscoverage = element._$jscoverage ||
            (element.contentWindow && element.contentWindow._$jscoverage)

          if (jscoverage) {
            var cov = map(jscoverage, verbose)
            ;delete cov.files
            data.info.coverage = cov
          }
        }

        labor.remove(orderId)
      }

      labor.reports.push(data)
    }
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

      if (verbose) {
        ret['missesDetail'] = missesDetail
      }
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

  /**
   * Return a plain-object representation of `test`
   * free of cyclic properties etc.
   *
   * @param {Object} test
   * @return {Object}
   * @api private
   */
  function clean(test) {
    return {
      title: test.title,
      fullTitle: test.fullTitle(),
      duration: test.duration
    }
  }

})()

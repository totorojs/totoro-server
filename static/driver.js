(function() {
  if ( typeof console === 'undefined') {
    console = {
      log: function(msg) {
        var el = document.createElement('div')
        el.innerHTML = msg
        document.body.appendChild(el)

        setTimeout(function() {
          document.body.removeChild(el)
        }, 30 * 000)
      }
    }
  }

  function Driver() {
    var that = this
    var socket = this.socket = io.connect('/__labor')

    this.orders = {}

    socket.on('connect', function() {
      console.log('Connect')
      socket.emit('init', navigator.userAgent)
    })

    socket.on('disconnect', function() {
      console.log('Disconnect')
      for (var orderKey in that.orders) {
        that.remove(orderKey)
      }
    })

    socket.on('add', function(data) {
      that.add(data)
    })
    socket.on('remove', function(data) {
      that.remove(data)
    })
  }

  Driver.prototype.add = function(data) {
    var orderId = data.orderId
    var laborId = data.laborId
    var href = data.href.replace(/https?\:\/\/[^/]+?\//, '/')
    var hasQuery = href.indexOf('?') !== -1
    var src = href.replace(
      /(#.*$)|$/,
      (hasQuery ? '&' : '?') +'__totoro_oid=' + orderId +
      '&' + '__totoro_lid=' + laborId +
      '$1')

    var el
    if (data.ua.group === 'mobile') {
      el = document.createElement('iframe')
      el.src = src
      document.body.appendChild(el)
    } else {
      el = window.open(src, 'totoro_' + (new Date()).getTime(), 'top=100,left=100,width=400,height=300')
    }

    var orderKey = orderId + '-' + laborId
    this.orders[orderKey] = el

    console.log('Add order <', src, '>')
  }

  Driver.prototype.remove = function(data) {
    var orderKey
    if (typeof data === 'string' && data in this.orders) {
      orderKey = data
    } else {
      orderKey = data.orderId + '-' + data.laborId
    }

    var el = this.orders[orderKey]

    if (el) {
      delete this.orders[orderKey]

      if (el.nodeName) {
        document.body.removeChild(el)
      } else {
        el.close()
      }

      console.log('Remove order <', orderKey, '>')
    }
  }


  var driver = new Driver()


})()

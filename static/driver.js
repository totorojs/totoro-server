(function() {
  if (typeof console === 'undefined') {
    console = {
      log: function() {
        var el = document.createElement('div')
        el.innerHTML = [].slice.call(arguments, 0).join(' ')
        document.body.appendChild(el)

        setTimeout(function() {
          document.body.removeChild(el)
        }, 30 * 1000)
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
    var runner = data.runner

    var el
    if (data.laborTrait.group === 'mobile') {
      el = document.createElement('iframe')
      el.src = runner
      document.body.appendChild(el)
    } else {
      el = window.open(runner, 'totoro_' + (new Date()).getTime(), 'top=100,left=100,width=400,height=300')
    }

    var orderKey = data.orderId + '-' + data.laborId
    this.orders[orderKey] = el

    console.log('Add order <', runner, '>')
  }

  Driver.prototype.remove = function(data) {
    var orderKey
    // when socket disconnect, will pass order key in to close all runners
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

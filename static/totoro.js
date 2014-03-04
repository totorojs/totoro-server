(function() {
  window.totoro = (window.opener || window.top).totoro

  var id = totoro.getOrderId(location.href)

  totoro.end = function() {
    totoro.report({
      action: 'end',
      orderId: id,
      info: {}
    })
  }


  if ( typeof console === 'undefined') {
      console = {}
  }

  console.log = function() {
    totoro.report({
      action: 'log',
      orderId: id,
      info: [].slice.call(arguments, 0)
    })
  }


  window.alert = function(){}
  window.confirm = function(){return false}
  window.prompt = function(){return null}

  window.onerror = function(message, url, line){
    totoro.report({
      orderId: id,
      action: 'onerror',
      info: {
        error: {
          message: message,
          url: url,
          line: line
        }
      }
    })
    return true
  }
})()

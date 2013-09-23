
(function() {

    window.totoro = (window.opener || window.top).totoro

    window.alert = function(){}
    window.confirm = function(){return false}
    window.prompt = function(){return null}

    var report = totoro.report
    var id = location.href.match(/runner\/([^/]+)\//)[1]

    window.onerror = function(message, url, line){
        report({
            orderId: id,
            action: 'end',
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

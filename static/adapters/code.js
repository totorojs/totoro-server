window.totoro = (window.opener || window.top).totoro

var id = location.href.match(/runner\/([^/]+)\//)[1]

window.totoro.end = function() {
    this.report({
        action: 'end',
        orderId: id,
        info: {}
    })
}


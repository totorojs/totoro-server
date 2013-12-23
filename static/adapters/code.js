// a special adapter for run common code rather than test code
(function() {
    window.totoro.end = function() {
        this.report({
            action: 'end',
            orderId: location.href.match(/runner\/([^/]+)\//)[1],
            info: {}
        })
    }
})()



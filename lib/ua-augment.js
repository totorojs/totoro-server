'use strict';

var desktopDevices = ['pc', 'mac', 'linux']
// var groups = ['desktop', 'mobile', 'other']


exports.getGroup = function(ua) {
    var deviceName = (ua.device && ua.device.name) || 'na'
    if (desktopDevices.indexOf(deviceName) > -1) {
        return 'desktop'
    } else if (deviceName !== 'na') {
        return 'mobile'
    } else {
        return 'other'
    }
}


var winDevicesMapping = [
    [/6\.1$/, '7'],
    [/5\.1$/, 'XP'],
    [/6\.[23]$/, '8'],
    [/6\.0$/, 'Vista'],
    [/5\.2$/, 'XP x64 Edition'],
    [/5\.0$/, '2000'],
    [/5\.01$/, '2000, Service Pack 1 (SP1)']
]

exports.mappingOsVersion = function(ua) {
     if (ua && ua.device.name === 'pc') {
          var ver = ua.os.fullVersion
          winDevicesMapping.forEach(function(vm) {
               if (vm[0].test(ver)) {
                   ua.os.fullVersion = vm[1]
               }
          })
     }
}



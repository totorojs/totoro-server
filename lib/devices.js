'use strict';

var desktopDevices = exports.desktopDevices = ['pc', 'mac', 'linux']

exports.getType = function(detector) {
    var deviceName = (detector.device && detector.device.name) || detector
    if (desktopDevices.indexOf(deviceName) > -1) {
        return 'desktop'
    } else if (deviceName !== 'na') {
        return 'mobile'
    } else {
        return 'other'
    }
}

var winDevicesMapping = [
        [/6\.1$/, 'Windows 7'],
        [/5\.1$/, 'Windows XP'],
        [/6\.[23]$/, 'Windows 8'],
        [/6\.0$/, 'Windows Vista'],
        [/5\.2$/, 'Windows XP x64 Edition'],
        [/5\.0$/, 'windows 2000'],
        [/5\.01$/, 'Windows 2000, Service Pack 1 (SP1)']
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

exports.deviceType = ['desktop', 'mobile', 'other']


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

exports.deviceType = ['desktop', 'mobile', 'other']


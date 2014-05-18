'use strict';

var detector = require('detector')


var desktopDevices = ['pc', 'mac', 'linux']

function getGroup(ua) {
  var deviceName = (ua.device && ua.device.name) || 'na'
  if (desktopDevices.indexOf(deviceName) > -1) {
    return 'desktop'
  } else if (deviceName !== 'na') {
    return 'mobile'
  } else {
    return 'other'
  }
}


var winDevicesMap = [
  [/6\.1$/, '7'],
  [/5\.1$/, 'XP'],
  [/6\.[23]$/, '8'],
  [/6\.0$/, 'Vista'],
  [/5\.2$/, 'XP x64 Edition'],
  [/5\.0$/, '2000'],
  [/5\.01$/, '2000, Service Pack 1 (SP1)']
]

function mapOsVersion(ua) {
  if (ua && ua.device.name === 'pc') {
    var ver = ua.os.fullVersion
    winDevicesMap.forEach(function(vm) {
      if (vm[0].test(ver)) {
        ua.os.fullVersion = vm[1]
      }
    })
  }
}


function parse(str) {
  var ua = detector.parse(str)
  return {
    browser: {
      name: ua.browser.name,
      fullVersion: ua.browser.fullVersion
    },
    os: {
      name: ua.os.name,
      fullVersion: ua.os.fullVersion
    }
  }
}

exports.parse = function(ua) {
  if (typeof ua === 'string') ua = detector.parse(ua)
  mapOsVersion(ua)
  ua.group = getGroup(ua)
  ua.toString = function() {
    return ua.browser.name + ' ' + ua.browser.fullVersion + ' / ' +
           ua.os.name + ' ' + ua.os.fullVersion
  }
}


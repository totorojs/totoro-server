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


var winOsVersionMap = [
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
    var ver = ua.os.version.replace(/(\d+\.\d+).*/, '$1');
    winOsVersionMap.forEach(function(m) {
      if (m[0].test(ver)) {
        ua.os.version = m[1]
      }
    })
  }
}


exports.parse = function(ua) {
  if (typeof ua === 'string') {
    var temp = detector.parse(ua)
    ua = {
      browser: {
        name: temp.browser.name,
        version: temp.browser.fullVersion
      },
      os: {
        name: temp.os.name,
        version: temp.os.fullVersion
      },
      device: {
        name: temp.device.name
      }
    }
  }

  ua.browser.version= ua.browser.version.replace(/(\d+\.\d+).*/, '$1')
  ua.os.version= ua.os.version.replace(/(\d+\.\d+).*/, '$1')

  mapOsVersion(ua)

  ua.group = ua.group || getGroup(ua)
  ua.toString = function() {
    return ua.browser.name + ' ' + ua.browser.version + ' / ' +
           ua.os.name + ' ' + ua.os.version
  }
  return ua
}

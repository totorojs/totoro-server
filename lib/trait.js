'use strict';

var detector = require('detector')
var desktopDevices = ['pc', 'mac', 'linux']


function getGroup(data) {
  var deviceName = (data.device && data.device.name) || 'na'
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

function mapOsVersion(data) {
  if (data && data.device.name === 'pc') {
    var ver = data.os.version.match(/\d+\.\d+/)[0]
    winOsVersionMap.forEach(function(m) {
      if (m[0].test(ver)) {
        data.os.version = m[1]
      }
    })
  }
}


exports.normalize = function(data) {
  if (typeof data === 'string') {
    var ua = detector.parse(data)
    data = {
      agent: {
        name: ua.browser.name,
        version: ua.browser.fullVersion
      },
      os: {
        name: ua.os.name,
        version: ua.os.fullVersion
      },
      device: {
        name: ua.device.name
      }
    }
  }

  //data.agent.version= data.agent.version.replace(/(\d+\.\d+).*/, '$1')
  //data.os.version= data.os.version.replace(/(\d+\.\d+).*/, '$1')

  mapOsVersion(data)

  data.group = data.group || getGroup(data)

  return data
}

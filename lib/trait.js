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


exports.ua2trait = function(data) {
  var ua = detector.parse(data)
  return {
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


exports.normalize = function(data, autoGroup) {
  if (typeof data === 'string') {
    data = str2obj(data)
  }

  // backward compatible
  if ('browser' in data) {
    data.agent = data.browser
    ; delete data.browser
  }

  ['agent', 'os', 'device'].forEach(function(key) {
    data[key] = data[key] || {}
  })

  mapOsVersion(data)

  if (autoGroup) data.group = data.group || getGroup(data)

  return data
}


exports.tostr = function(data) {
  var str = ''

  str += data.agent.name || ''
  str += ' '
  str += data.agent.version || ''
  str += '/'

  str += data.os.name || ''
  str += ' '
  str += data.os.version || ''
  str += '/'

  str += data.device.name || ''
  str += '/'

  str += data.group || ''

  return str
}


exports.flat = function(data) {
  return [
    data.agent.name,
    data.agent.version,
    data.os.name,
    data.os.version,
    data.device.name,
    data.group
  ]
}


var versionReg = /\/(\d+\.)*\d+$/g
var singleSlashReg = /^[^/]*\/[^/]*$/g
function str2obj(data) {
  if(!data.match(versionReg)) {
    data = data + '/'
  }
  if(data.match(singleSlashReg)) {
    data = '/' + data
  }

  var temp = data.split('/')
  var rt = {agent: {}, os: {}, device: {}}
  temp[0] && (rt.os.name = temp[0])
  temp[1] && (rt.agent.name = temp[1])
  temp[2] && (rt.agent.version = temp[2])

  return rt
}

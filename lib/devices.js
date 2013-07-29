'use strict';

var desktopDevices = ['desktop', 'mac', 'linux']
var mobileDevices = []

var devices = {
    pc: 'Windows PC',
    mac: 'Macintosh PC',
    iphone: 'iPhone',
    ipad: 'iPad',
    ipod: 'iPod',
    android: 'Android',
    blackberry: '黑莓(Blackberry)手机',
    wp: 'Windows Phone',
    mi: '小米',
    meizu: '魅族',
    nexus: 'Nexus',
    nokia: 'Nokia',
    samsung: '三星手机',
    aliyun: '阿里云手机',
    huawei: '华为手机',
    lenovo: '联想手机',
    zte: '中兴手机',
    vivo: '步步高手机',
    htc: 'HTC',
    oppo: 'OPPO 手机',
    konka: '康佳手机',
    sonyericsson: '索尼爱立信手机',
    coolpad: '酷派手机',
    lg: 'LG 手机'
}

Object.keys(devices).forEach(function(deviceName) {
    if (desktopDevices.indexOf(deviceName) < 0) {
        mobileDevices.push(deviceName)
    }
})

exports.devices = devices

exports.groupDevices = {
    desktop: desktopDevices,
    mobile: mobileDevices
}

exports.getType = function(detector) {
    var deviceName = (detector.device && detector.device.name) || detector
    if (desktopDevices.indexOf(deviceName) > -1) {
        return 'desktop'
    } else if (mobileDevices.indexOf(deviceName) > -1) {
        return 'mobile'
    } else {
        return 'other'
    }
}


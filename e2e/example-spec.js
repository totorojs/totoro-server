var path = require('path')
var expect = require('expect.js')
var sinon = require('sinon')
var shelljs = require('shelljs')
var when = require('when')


describe('Test start totoro server ', function() {
    var logDatas = []

    shelljs.cd(path.resolve('node_modules'))
    it('log succ info', function(done) {
        var start = shelljs.exec('node ../bin/totoro-server', {async: true});
        start.stdout.on('data', function(data) {
            expect(data).to.match(/Start server/);
            shelljs.exec('kill -9 ' + start.pid)
            done()
        })

        start.stderr.on('data', function(err) {
            expect(err).to.be(null)
            done()
        })
    })

    it('check totoro client', function(done) {

        var version = shelljs.exec('node totoro/bin/totoro --version', {slient: true}).output
        expect(version).to.match(/0\.3\.[\d]/)
        done()
    })
})

describe('test sample project', function() {
    var server, browsers, capture


    shelljs.cd(path.resolve('node_modules'))

    before(function(done) {
        var serverDefer = when.defer()
        var browsersDefer = when.defer()

        // start server
        server = shelljs.exec('node ../bin/totoro-server --verbose', {async: true});
        server.stdout.on('data', function(data) {
            if (data.indexOf('Start server') > -1) {
                capture = data.match(/<([^>]+)/)[1]
                serverDefer.resolve()
            }

            if (data.indexOf('New labor') > -1) {
                browsersDefer.resolve()
            }
        })

        serverDefer.promise.then(function() {
            // open chrome
            //browsers = shelljs.exec('node browsers/bin/browsers --browsers=chrome --capture=' + capture, {async: true})
            var BrowsersLauncher = require(path.resolve('browsers', 'lib', 'launcher.js')).Launcher
            browsers = new BrowsersLauncher({})
            browsers.launch('chrome', capture)
        })

        browsersDefer.promise.then(function() {
            done()
        })
    })

    var totoroCmd = 'node totoro/bin/totoro'

    it('test totoro list', function(done) {
        var serverHost = capture.slice(0, capture.indexOf(':'))
        // var listInfo = shelljs.exec(totoroCmd + ' list', {async: false, slient: true}).output
        var listInfo = shelljs.exec(totoroCmd + ' list --server-host=' + serverHost , {async: false}).output
        expect(listInfo + '').to.match(/chrome/)

        setTimeout(function() {
          done()
        }, 1000)
    })

    it('test project', function() {

    })



    after(function(done) {
        // close chrome
        // stop server
        shelljs.exec('kill -9 ' + server.pid)
        browsers.kill('chrome', function() {
            done()
        })
        //shelljs.exec('kill -9 ' + browsers.pid)
    })
})

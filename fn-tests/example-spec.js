'use strict';

var path = require('path')
var expect = require('expect.js')
var sinon = require('sinon')
var shelljs = require('shelljs')
var when = require('when')


shelljs.cd(path.join(process.cwd(), 'node_modules'))

describe('Test start totoro server ', function() {
    var logDatas = []

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
    this.timeout(1000000)
    var server, browsers, capture, serverHost, serverPort

    before(function(done) {
        var serverDefer = when.defer()
        var browsersDefer = when.defer()

        // start server
        server = shelljs.exec('node ../bin/totoro-server', {async: true, slient: true});
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
            serverHost = capture.slice(0, capture.indexOf(':'))
            serverPort = capture.slice(capture.indexOf(':') + 1)
            done()
        })
    })

    var totoroCmd = 'node totoro/bin/totoro'

    it('test totoro list', function(done) {
        // var listInfo = shelljs.exec(totoroCmd + ' list', {async: false, slient: true}).output
        var listInfo = shelljs.exec(totoroCmd + ' list ' + getServerHost() + getServerPort(), {async: false}).output
        expect(listInfo + '').to.match(/chrome/)

        setTimeout(function() {
          done()
        }, 1000)
    })

    var examplesDir = path.resolve('totoro', 'examples')

    it('test config-file', function() {
        var result = shelljs.exec(getTotoroTestCmd(getRunner('config-file')), {slient: true}).output
        expect(result).to.contain('Passed all of 2 tests')
    })


    it('test custom-testing-framework by seajs', function(done) {
        var seajs = shelljs.exec(getTotoroTestCmd(' --runner=http://seajs.github.io/seajs/tests/runner.html') +
             ' --adapter=http://seajs.github.io/seajs/tests/totoro-adapter.js', {async: true})

        seajs.stdout.on('data', function(data) {
            console.info('seajs test running...')
            if (data.indexOf('Passed on all of') > -1) {
                expect(data).to.match(/Passed on all of \d\s+browsers/)
                done()
            }
        })

        seajs.stderr.on('data', function(err) {
            expect(err).to.be(null)
            done()
        })
    })

    it('test jasmine', function() {
        var result = shelljs.exec(getTotoroTestCmd(getRunner('jasmine')), {slient: true}).output
        expect(result).to.match(/Passed all of \d+\s+tests/)
    })

    it('test mocha', function() {
        var result = shelljs.exec(getTotoroTestCmd(getRunner('mocha')), {slient: true}).output
        expect(result).to.match(/Passed all of \d+\s+tests/)
    })

    it('test online-runner', function() {
        var result = shelljs.exec(getTotoroTestCmd(' --runner=http://aralejs.org/base/tests/runner.html'), {slient: true}).output
        expect(result).to.match(/Passed all of \d+\s+tests/)
    })

    it('test simple', function() {
        var result = shelljs.exec(getTotoroTestCmd(getRunner('simple')), {slient: true}).output
        expect(result).to.match(/Passed all of \d+\s+tests/)
    })

    it('test syntax-error', function() {
        var result = shelljs.exec(getTotoroTestCmd(getRunner('syntax-error')), {slient: true}).output
        expect(result).to.contain('Uncaught ReferenceError: undef is not defined')
    })

    it('test test-fail', function() {
        var result = shelljs.exec(getTotoroTestCmd(getRunner('test-fail')), {slient: true}).output
        expect(result).to.contain('Test Suit Sub Test Suit > Sub Test Unit > expected \'sub assertion\' to be a number')
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

    function getRunner(project) {
        return ' --runner=' + path.join(examplesDir, project, 'tests', 'runner.html')
    }

    function getServerHost() {
        return ' --server-host=' + serverHost
    }

    function getServerPort() {
        return ' --server-port=' + serverPort
    }
    function getTotoroTestCmd(runner) {
        return totoroCmd + runner + getServerHost() + getServerPort()
    }
})


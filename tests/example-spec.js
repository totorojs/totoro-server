var path = require('path')
var expect = require('expect.js')
var should = require('should')
var sinon = require('sinon')
var shelljs = require('shelljs')


describe('Test start totoro server ', function() {
    var logDatas = []

    it('log succ info', function(done) {
        var start = shelljs.exec('node bin/totoro-server', {async: true});
        start.stdout.on('data', function(data) {
          expect(data).to.match(/Start server/);
          done()
        })

        start.stderr.on('data', function(err) {
          expect(err).to.be(null)
          done()
        })
    })

    it('check totoro client', function(done) {
        shelljs.cd(path.resolve('node_modules', 'totoro'))
        var version = shelljs.exec('node bin/totoro --version', {slient: true}).output
        expect(version).to.match(/0\.2\.3/)
        done()
    })
})

describe('Before and After', function() {

    before(function() {
    })


    after(function() {
    })
})

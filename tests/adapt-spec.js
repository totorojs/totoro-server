'use strict';

var fs = require('fs')
var path = require('path')
var expect = require('expect.js')

var adapt = require('../lib/adapt')

describe('adapt', function() {
    var head =
        '<!DOCTYPE>\n' +
        '<html>\n' +
            '<head>\n' +
                '<title>runner</title>\n'
    var tail =
            '</head>\n' +
            '<body></body>\n' +
        '</html>\n'

    var adapterScript = '<script src="/adapters/onerror.js"></script>' +
        '<script src="/adapters/mocha.js"></script>'

    describe('not specified adapter', function() {

        describe('can auto adapt', function() {
            it('test framework script is in a single line', function() {
                var beforeInsert = head +
                    '<link type="text/css" rel="stylesheet" href="http://assets.spmjs.org/gallery/mocha/1.9.0/mocha.css" />\n' +
                    '<script src="http://assets.spmjs.org/gallery/mocha/1.9.0/mocha.js"></script>'
                var afterInsert =
                    '<script src="other-script.js"></script>\n' +
                    tail
                var content = beforeInsert + afterInsert

                var rt = adapt('fakeId', content)

                expect(rt).to.be.a('string')
                expect(rt).to.be(beforeInsert + adapterScript + afterInsert)
            })

            it('test framework script is in mutiple lines', function() {
                var beforeInsert = head +
                    '<link type="text/css" rel="stylesheet" href="http://assets.spmjs.org/gallery/mocha/1.9.0/mocha.css" />\n' +
                    '<script src="\n' +
                        'http://assets.spmjs.org/gallery/mocha/1.9.0/mocha.js\n' +
                        '"></script>'
                var afterInsert =
                    '<script src="other-script.js"></script>\n' +
                    tail
                var content = beforeInsert + afterInsert

                var rt = adapt('fakeId', content)

                expect(rt).to.be.a('string')
                expect(rt).to.be(beforeInsert + adapterScript + afterInsert)
            })
        })

        it('cannot auto adapt', function() {
            var content = head + '<script src="not-existed.js"></script>' + tail
            var rt = adapt('fakeId', content)

            expect(rt).to.be.a(Error)
            expect(rt.message).to.be.match(/Can not guess which adapter should be used, /)
        })
    })


    describe('specified adapter', function() {
        var beforeInsert = head +
            '<link type="text/css" rel="stylesheet" href="any-css.css" />\n' +
            '<script src="any-js.js"></script>' +
            '<script src="any-other-js.js"></script>'
        var afterInsert = tail
        var content = beforeInsert + afterInsert

        describe('adapter is a keyword', function() {

            describe('keyword existed', function() {

                it('corresponding test framework script tag existed', function() {
                    var beforeInsert = head +
                        '<link type="text/css" rel="stylesheet" href="http://assets.spmjs.org/gallery/mocha/1.9.0/mocha.css" />\n' +
                        '<script src="http://assets.spmjs.org/gallery/mocha/1.9.0/mocha.js"></script>'
                    var afterInsert =
                        '<script src="other-script.js"></script>\n' +
                        tail
                    var content = beforeInsert + afterInsert

                    var rt = adapt('fakeId', content, 'mocha')

                    expect(rt).to.be.a('string')
                    expect(rt).to.be(beforeInsert + adapterScript + afterInsert)
                })

                it('corresponding test framework script tag not existed', function() {
                    var rt = adapt('fakeId', content, 'mocha')

                    expect(rt).to.be.a('string')
                    expect(rt).to.be(beforeInsert + adapterScript + afterInsert)
                })
            })

            it('keyword not existed', function() {
                var rt = adapt('fakeId', '', 'notExistedKeyword')

                expect(rt).to.be.a(Error)
                expect(rt.message).to.be.match(/Specified adapter "notExistedKeyword" is not available, /)
            })
        })


        it('adapter is a url', function() {
            var adapterUrl = 'http://fool2fish.cn/adapter.js'
            var rt = adapt('fakeId', content, adapterUrl)

            expect(rt).to.be.a('string')
            expect(rt).to.be(
                beforeInsert +
                '<script src="/adapters/onerror.js"></script>' +
                '<script src="' + adapterUrl + '"></script>' +
                afterInsert)
        })


        it('adapter is a file', function() {
            var adapterPath = 'path/to/adapter.js'
            var rt = adapt('fakeId', content, adapterPath)

            expect(rt).to.be.a('string')
            expect(rt).to.be(
                beforeInsert +
                '<script src="/adapters/onerror.js"></script>' +
                '<script src="/runner/fakeId/' + adapterPath + '"></script>' +
                afterInsert)
        })
    })

})


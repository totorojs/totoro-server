define(function(require) {
    var expect = require('expect')

    function isType(type) {
        return function(obj) {
            return {}.toString.call(obj) == "[object " + type + "]"
        }
    }

    var isObject = isType("Object")
    var isString = isType("String")
    var isArray = Array.isArray || isType("Array")
    var isFunction = isType("Function")


    describe('Current window', function() {
        var obj = {name: 'fool2fish'}
        var arr = ['one', 'two', 'three']
        function fn() {}

        describe('Array', function() {

            it('isArray()', function() {
                expect(isArray(arr)).to.be.ok()
            })

            it('toString()', function() {
                expect(arr.toString()).to.be('one,two,three')
            })

            it('Array.isArray()', function() {
                expect(Array.isArray(arr)).to.be.ok()
            })

            it('instanceof', function() {
                expect(arr instanceof Array).to.be.ok()
            })

            it('typeof', function() {
                expect(typeof arr).to.be('object')
            })

        })

        describe('Function', function() {

            it('isFunction()', function() {
                expect(isFunction(fn)).to.be.ok()
            })

            it('toString()', function() {
                expect(fn.toString()).to.be.match(/function.*\(.*\).*{.*}/)
            })

            it('instanceof', function() {
                expect(fn instanceof Function).to.be.ok()
            })

            it('typeof', function() {
                expect(typeof fn).to.be('function')
            })

        })

        describe('Object', function() {

            it('isObject()', function() {
                expect(isObject(obj)).to.be.ok()
            })

            it('toString()', function() {
                expect(obj.toString()).to.be('[object Object]')
            })

            it('instanceof', function() {
                expect(obj instanceof Object).to.be.ok()
            })

            it('typeof', function() {
                expect(typeof obj).to.be('object')
            })
        })
    })

    describe('New window', function() {
        var win = window.win

        describe('Array', function() {

            it('isArray()', function() {
                expect(isArray(win.arr)).to.be.ok()
            })

            it('toString()', function() {
                expect(win.arr.toString()).to.be('one,two,three')
            })

            it('Array.isArray()', function() {
                expect(Array.isArray(win.arr)).to.be.ok()
            })

            it('instanceof', function() {
                expect(win.arr instanceof Array).to.be.ok()
            })

            it('typeof', function() {
                expect(typeof win.arr).to.be('object')
            })

        })

        describe('Function', function() {

            it('isFunction()', function() {
                expect(isFunction(win.fn)).to.be.ok()
            })

            it('toString()', function() {
                expect(win.fn.toString()).to.be.match(/function.*\(.*\).*{.*}/)
            })

            it('instanceof', function() {
                expect(win.fn instanceof Function).to.be.ok()
            })

            it('typeof', function() {
                expect(typeof win.fn).to.be('function')
            })

        })

        describe('Object', function() {

            it('isObject()', function() {
                expect(isObject(win.obj)).to.be.ok()
            })

            it('toString()', function() {
                expect(win.obj.toString()).to.be('[object Object]')
            })

            it('instanceof', function() {
                expect(win.obj instanceof Object).to.be.ok()
            })

            it('typeof', function() {
                expect(typeof win.obj).to.be('object')
            })
        })

        after(function() {
            win.close()
        })
    })


    describe('Iframe', function() {

    })
})

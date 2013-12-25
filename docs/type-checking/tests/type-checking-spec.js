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

        describe('Other types', function() {
            var o = {}
                o.num = 1
                o.numo = new Number(1)
                o.nan = NaN
                o.str = 'string'
                o.stro = new String('string')
                o.bool = true
                o.boolo = new Boolean(true)
                o.nul = null
                o.udf = undefined
                o.date = new Date()
                o.reg = /regexp/
                o.rego = new RegExp('regexp')
                o.err = new Error()

            it('Number', function() {
                expect(typeof o.numo).to.be('object')
                expect(o.numo.toString()).to.be('1')
                expect(typeof o.num).to.be('number')
                expect(o.num.toString()).to.be('1')
                expect(typeof o.nan).to.be('number')
                expect(o.nan.toString()).to.be('NaN')
            })

            it('String', function() {
                expect(typeof o.stro).to.be('object')
                expect(o.stro.toString()).to.be('string')
                expect(typeof o.str).to.be('string')
                expect(o.str.toString()).to.be('string')
            })

            it('Boolean', function() {
                expect(typeof o.boolo).to.be('object')
                expect(o.boolo.toString()).to.be('true')
                expect(typeof o.bool).to.be('boolean')
                expect(o.bool.toString()).to.be('true')
            })

            it('null', function() {
                expect(typeof o.nul).to.be('object')
            })

            it('undefined', function() {
                expect(typeof o.udf).to.be('undefined')
            })

            it('Date', function() {
                expect(typeof o.date).to.be('object')
                expect(o.date.toString()).not.to.be('[object Object]')
            })

            it('RegExp', function() {
                expect(typeof o.rego).to.be('object')
                expect(o.rego.toString()).to.be('/regexp/')
                expect(typeof o.reg).to.be('object')
                expect(o.reg.toString()).to.be('/regexp/')
            })

            it('Error', function() {
                expect(typeof o.err).to.be('object')
                expect(o.err.toString()).to.be('Error')
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

        describe('Other types', function() {
            it('Number', function() {
                expect(typeof win.numo).to.be('object')
                expect(win.numo.toString()).to.be('1')
                expect(typeof win.num).to.be('number')
                expect(win.num.toString()).to.be('1')
                expect(typeof win.nan).to.be('number')
                expect(win.nan.toString()).to.be('NaN')
            })

            it('String', function() {
                expect(typeof win.stro).to.be('object')
                expect(win.stro.toString()).to.be('string')
                expect(typeof win.str).to.be('string')
                expect(win.str.toString()).to.be('string')
            })

            it('Boolean', function() {
                expect(typeof win.boolo).to.be('object')
                expect(win.boolo.toString()).to.be('true')
                expect(typeof win.bool).to.be('boolean')
                expect(win.bool.toString()).to.be('true')
            })

            it('null', function() {
                expect(typeof win.nul).to.be('object')
            })

            it('undefined', function() {
                expect(typeof win.udf).to.be('undefined')
            })

            it('Date', function() {
                expect(typeof win.date).to.be('object')
                expect(win.date.toString()).not.to.be('[object Object]')
            })

            it('RegExp', function() {
                expect(typeof win.rego).to.be('object')
                expect(win.rego.toString()).to.be('/regexp/')
                expect(typeof win.reg).to.be('object')
                expect(win.reg.toString()).to.be('/regexp/')
            })

            it('Error', function() {
                expect(typeof win.err).to.be('object')
                expect(win.err.toString()).to.be('Error')
            })
        })

        after(function() {
            win.close()
        })
    })


    describe('Iframe', function() {

    })
})

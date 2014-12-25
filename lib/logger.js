'use strict';

var fs = require('fs')
var path = require('path')
var tracer = require('tracer')
var colorful = require('colorful')

var methods = ['debug', 'info', 'warn', 'error']
var level = 'info'

module.exports = tracer.console({
  inspectOpt: {depth: null},
  methods: methods,
  level: 'debug',

  format: "{{title}} {{timestamp}} {{file}}:{{line}} | {{message}}",
  dateformat: 'yyyy-mm-dd HH:MM:ss',

  filters: {
    info: colorful.gray,
    warn: colorful.yellow,
    error: colorful.red
  },

  transport: function(data) {
    var title = data.title
    if (methods.indexOf(title) >= methods.indexOf(level)) {
      console.log(data.output)
      LogFile.write(data)
    }
  }
})

module.exports.setLevel = function(l) {
  if (methods.indexOf(l) === -1) return
  level = l
}


function LogFile() {}

LogFile.write = function(data) {
  var date = data.timestamp.replace(/^(\d+)-(\d+)-(\d+).+$/, '$1$2$3')

  if (this.date && this.date !== date) {
    ;delete this.date
    ;delete this.path
    this.close()
  }

  if (!this.date) {
    this.date = date
    this.path = path.join('totoro-server-logs', this.date + '.log')
    this.open()
  }

  this.stream.write(data.output + '\n')
}

LogFile.open = function() {
  if (!fs.existsSync(path.dirname(this.path))) {
    fs.mkdirSync(path.dirname(this.path))
  }

  this.stream = fs.createWriteStream(this.path, {
    flags: 'a',
    encoding: 'utf8'
  })
}

LogFile.close = function() {
  if (this.stream) {
    this.stream.end()
    this.stream.destroySoon()
    ;delete this.stream
  }
}


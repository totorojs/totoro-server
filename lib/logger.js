'use strict';

var fs = require('fs')
var path = require('path')
var tracer = require('tracer')
var colorful = require('colorful')

var levels = ['debug', 'info', 'warn', 'error']
var logLevel = 'info'

var filters = {
  debug: function(input) {return input},
  info: colorful.gray,
  warn: colorful.yellow,
  error: colorful.red
}

process.argv.forEach(function(item, idx, list) {
  if (item.match(/^(--debug|-[a-zA-Z]*d[a-zA-Z]*)$/)) {
    logLevel = 'debug'
  }
});

module.exports = tracer.console({
  depth: null,
  methods: levels,
  level: logLevel,

  format: "{{title}} {{timestamp}} {{file}}:{{line}} | {{message}}",
  dateformat: 'yyyy-mm-dd HH:MM:ss',

  transport: function(data) {
    var title = data.title
    console.log(filters[title](data.output))
    LogFile.write(data)
  }
})




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


/*
 * totoro-server
 * https://github.com/totorojs/totoro-server
 *
 * Copyright (c) 2013 kangpangpang, fool2fish
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path')
var shell = require('shelljs');

module.exports = function(grunt) {

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  if (!grunt.file.exists(path.resolve('node_modules', 'totoro'))) {
      shell.exec('npm install totoro');
  }

  if (!grunt.file.exists(path.resolve('node_modules', 'browsers'))) {
      shell.exec('npm install browsers');
  }


  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
          'Gruntfile.js',
          'lib/**/*.js'
      ],
      options: {
          'jshintrc': '.jshintrc'
      }
    },

    mochaTest: {
      all: {
        options: {
            reporter: 'spec',
            // tests are quite slow as thy spawn node processes
            timeout: 10000
        },
        src: ['tests/*.js']
      }
    }
  });


  grunt.registerTask('default', ['jshint']);
};

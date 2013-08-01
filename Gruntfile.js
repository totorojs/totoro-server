/*
 * totoro-server
 * https://github.com/totorojs/totoro-server
 *
 * Copyright (c) 2013 kangpangpang, fool2fish
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path')
var shelljs = require('shelljs');

module.exports = function(grunt) {

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');


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

    shell: {
        options: {
            stdout: true,
            stderr: true,
            execOptions: {
                cwd: './node_modules/'
            }
        },
        installTotoroDev: {
            command: [
                'git clone https://github.com/totorojs/totoro.git',
                'cd totoro',
                'npm install .'
            ].join('&&'),
        },
        updateTotoroDev: {
            command: [
                'cd totoro',
                'git pull'
            ].join('&&')
        },
        totoroNpm: {
            command: 'npm install totoro'
        },
        installBrowsers: {
            command: 'npm install browsers'
        }
    },

    mochaTest: {
      all: {
        options: {
            reporter: 'spec',
            // tests are quite slow as thy spawn node processes
            timeout: 1000000
        },
        src: ['e2e/*.js']
      }
    }
  });

  grunt.registerTask('loadResource', 'install totoro and browsrs', function() {
      if (!grunt.file.exists(path.resolve('node_modules', 'totoro'))) {
          grunt.task.run('shell:installTotoroDev');
      } else {
          grunt.task.run('shell:updateTotoroDev');
      }

      if (!grunt.file.exists(path.resolve('node_modules', 'browsers'))) {
          grunt.task.run('shell:installBrowsers');
      }
  });

  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('fntest', ['loadResource', 'mochaTest']);
};

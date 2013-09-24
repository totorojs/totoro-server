'use strict';

var path = require('path')
var shelljs = require('shelljs')


module.exports = function(grunt) {

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-shell')
    grunt.loadNpmTasks('grunt-mocha-test')
    grunt.loadNpmTasks('grunt-contrib-jshint')

    // Project configuration.
    grunt.initConfig({

        jshint: {
            all: [
                'Gruntfile.js',
                'lib/*.js',
                'fn-tests/*.js'
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
            },

            installMocha: {
                command: 'npm install mocha -g'
            },

            installJscoverage: {
                command: 'npm install jscoverage -g'
            },

            coverage: {
                options: {
                    stdout: true,
                    stderr: true,
                    execOptions: {
                        cwd: './'
                    }
                },
                command: [
                    'jscoverage lib lib-cov',
                    'mv lib lib-bak',
                    'mv lib-cov lib',
                    'mocha tests -R json-cov | node scripts/coverage.js',
                    'mocha tests -R html-cov > coverage.html',
                    'rm -rf lib',
                    'mv lib-bak lib'
                ].join('&&')
            }
        },

        mochaTest: {

            unittest: {
                options: {
                    reporter: 'dot'
                },
                src: ['tests/*-spec.js']
            },

            fntest: {
                options: {
                    reporter: 'spec',
                    // tests are quite slow as the spawn node processes
                    timeout: 1000000
                },
                src: ['fn-tests/*.js']
            }
        }
    })

    grunt.registerTask('beforeFntest', 'install totoro and browsrs', function() {
        if (!grunt.file.exists(path.resolve('node_modules', 'totoro'))) {
            grunt.task.run('shell:installTotoroDev')
        } else {
            grunt.task.run('shell:updateTotoroDev')
        }

        if (!grunt.file.exists(path.resolve('node_modules', 'browsers'))) {
            grunt.task.run('shell:installBrowsers')
        }
    })

    grunt.registerTask('beforeCoverage', 'install mocha and jscoverage', function() {
        if (shelljs.exec('mocha --version', {silent: true}).code !== 0) {
            grunt.task.run('shell:installMocha')
        }

        if (shelljs.exec('jscoverage --version', {silent: true}).code !== 0) {
            grunt.task.run('shell:installJscoverage')
        }
    })

    grunt.registerTask('default', ['jshint', 'test', 'coverage'])
    grunt.registerTask('test', ['mochaTest:unittest'])
    grunt.registerTask('coverage', ['beforeCoverage', 'shell:coverage'])
    grunt.registerTask('fntest', ['beforeFntest', 'mochaTest:fntest'])
};

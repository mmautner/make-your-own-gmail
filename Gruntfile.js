module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  var appConfig = {
    app: 'app',
    dist: 'dist'
  };

  grunt.initConfig({
    scriptermail: appConfig,

    jshint: {
      files: [
        '<%= scriptermail.app =>/js/**/*.js'
      ]
    },

    filerev: {
      dist: {
        src: [
          '<%= scriptermail.dist %>/css/{,*/}*.css',
        ]
      }
    },

    ngtemplates: {
      build: {
        cwd: '<%= scriptermail.app =>',
        src: 'views/**/*.html',
        dest: './dist/js/templates.js',
        options: {
          prefix: '',
          htmlmin: {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
          },
          bootstrap: function(module, script) {
            return '\
            define(["angular"], function (angular) {\
              "use strict";\
              var templates = angular.module("templates", []);\
              templates.run(["$templateCache", function($templateCache) {\
              ' + script + '\
              }]);\
              return templates;\
            });';
          }
        }
      }
    },

    wiredep: {
      app: {
        src: ['<%= scriptermail.app %>/index.html'],
        ignorePath:  /\.\.\//
      }
    },

    useminPrepare: {
      html: '<%= scriptermail.app %>/index.html',
      options: {
        dest: '<%= scriptermail.dist %>',
        flow: {
          html: {
            steps: {
              js: ['concat', 'uglifyjs'],
              css: ['cssmin']
            },
            post: {}
          }
        }
      }
    },

    // Performs rewrites based on filerev and the useminPrepare configuration
    usemin: {
      html: ['<%= scriptermail.dist %>/{,*/}*.html'],
      css: ['<%= scriptermail.dist %>/css/{,*/}*.css'],
      options: {
        assetsDirs: [
          '<%= scriptermail.dist %>',
          '<%= scriptermail.dist %>/img',
          '<%= scriptermail.dist %>/css'
        ]
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= scriptermail.app %>',
          dest: '<%= scriptermail.dist %>',
          src: [
            '*.{ico,png,txt}',
            '*.html',
            'app.js',
            'main.js',
            'views/*.html',
            'img/*',
            'js/**/*.js',
            'css/**/*.css'
          ]
        }, {
          expand: true,
          dot: true,
          cwd: '<%= scriptermail.app %>',
          dest: '<%= scriptermail.dist %>/',
          src: [
            'bower/**',
          ]
        }]
      },
      styles: {
        expand: true,
        cwd: '<%= scriptermail.app %>/css',
        dest: '.tmp/css/',
        src: '{,*/}*.css'
      },
      fonts: {
        expand: true,
        dot: true,
        flatten: true,
        cwd: '<%= scriptermail.app %>/bower',
        dest: '.tmp/fonts/',
        src: [
          '**/{,*/}*.{woff,eot,svg,ttf,otf}'
        ]
      }
    },

    // https://github.com/wmluke/grunt-inline-angular-templates
    inline_angular_templates: {
      dist: {
        options: {
          selector: 'body',       // (Optional) CSS selector of the element to use to insert the templates. Default is `body`.
          method: 'append',       // (Optional) DOM insert method. Default is `prepend`.
        },
        files: {
          'dist/index.html': ['dist/views/*.html']
        }
      }
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= scriptermail.dist %>/{,*/}*',
            '!<%= scriptermail.dist %>/.git{,*/}*'
          ]
        }]
      },
      server: '.tmp'
    },
  });

  grunt.registerTask('build', [
    'clean:dist',
    'wiredep',
    'useminPrepare',
    'copy:dist',
    'ngtemplates',
    'filerev',
    'usemin'
  ]);

  grunt.registerTask('default', ['build']);
};

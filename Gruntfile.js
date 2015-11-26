module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    srcDir: 'app',
    buildDir: 'dist',
    tmpDir: '.tmp',

    clean: [
      '<%= buildDir %>',
      '<%= tmpDir %>'
    ],

    replace: {
      dist: {
        options: {
          patterns: [
            {
              match: 'GOOGLE_CLIENT_ID',
              replacement: process.env.GOOGLE_CLIENT_ID
            },
          ]
        },
        files: [
          {
            expand: true,
            flatten: true,
            src: ['<%= srcDir %>/js/env.js'],
            dest: '<%= buildDir %>/js/'
          },
        ]
      }
    },

    ngtemplates: {
      default: {
        cwd: '<%= srcDir %>',
        src: 'views/*.html',
        dest: '<%= buildDir %>/templates.js',
        options: {
          usemin: '<%= buildDir %>/app.min.js',
          module: 'scriptermail'
        }
      }
    },

    wiredep: {
      default: {
        src: ['<%= buildDir %>/index.html']
      }
    },

    useminPrepare: {
      html: '<%= buildDir %>/index.html',
      options: {
        root: '<%= srcDir %>',
        dest: '<%= buildDir %>'
      }
    },

    usemin: {
      html: '<%= buildDir %>/index.html',
    },

    uglify: {
      generated: {
        options: {
          sourceMap: true
        }
      }
    },

    cssmin: {
      generated: {
        options: {
          processImport: false
        }
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= srcDir %>',
          dest: '<%= buildDir %>',
          src: [
            '*.{ico,png,txt}',
            '*.html',
            'views/*.html',
            'img/*',
            'js/**/*.js',
            'css/**/*.css'
          ]
        }, {
          expand: true,
          dot: true,
          cwd: '<%= srcDir %>',
          dest: '<%= buildDir %>/',
          src: [
            'bower/**',
          ]
        }, {
          expand: true,
          dot: true,
          flatten: true,
          cwd: '<%= srcDir %>/bower',
          dest: '<%= buildDir %>/fonts/',
          src: [
            '**/{,*/}*.{woff,woff2,eot,svg,ttf,otf}'
          ]
        }]
      },
      styles: {
        expand: true,
        cwd: '<%= srcDir %>/css',
        dest: '.tmp/css/',
        src: '{,*/}*.css'
      },
      fonts: {
        expand: true,
        dot: true,
        flatten: true,
        dest: '.tmp/fonts/',
        src: [
          '**/{,*/}*.{woff,woff2,eot,svg,ttf,otf}'
        ]
      }
    },

    connect: {
      dev: {
        options: {
          port: process.env.PORT || 3474,
          base: '<%= srcDir %>',
          keepalive: true,
          middleware: function(connect, options, middlewares) {
            // http://stackoverflow.com/a/21514926
            var modRewrite = require('connect-modrewrite');
            middlewares.unshift(modRewrite(['!\\.html|\\.js|\\.woff|\\.woff2|\\.ttf|\\.svg|\\.css|\\.png$ /index.html [L]']));
            return middlewares;
          }
        }
      },
      server: {
        options: {
          port: process.env.PORT || 3474,
          base: '<%= buildDir %>',
          //keepalive: true,
          middleware: function(connect, options, middlewares) {
            // http://stackoverflow.com/a/21514926
            var modRewrite = require('connect-modrewrite');
            middlewares.unshift(modRewrite(['!\\.html|\\.js|\\.woff|\\.woff2|\\.ttf|\\.svg|\\.css|\\.png$ /index.html [L]']));
            return middlewares;
          }
        }
      }
    },

    watch: {
      gruntfile: {
        files: ['Gruntfile.js'],
        tasks: ['build']
      },
      index: {
        files: ['<%= srcDir %>/**'],
        tasks: ['build']
      },
      options: {
        livereload: true
      }
    }
  });

  grunt.registerTask('build-usemin', [
    'useminPrepare',
    'ngtemplates',
    'concat:generated',
    'cssmin:generated',
    'uglify:generated',
    'usemin'
  ]);

  grunt.registerTask('build', [
    'clean',
    'copy:dist',
    'replace',
    'wiredep',
    'build-usemin'
  ]);
  grunt.registerTask('serve', [
    'build',
    'connect:server',
    'watch'
  ]);
  grunt.registerTask('default', ['build']);
};

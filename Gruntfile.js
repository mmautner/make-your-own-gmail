module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      build: {
        src: 'app/js/app.js',
        dest: 'dist/js/app.min.js'
      }
    }
  });

  grunt.registerTask('default', ['uglify']);
};

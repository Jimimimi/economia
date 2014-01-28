module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options:{
            banner: '(function(window){ \n',
            footer: '\n })(window)'},
      dist:{
        src: [
        'src/Class.js',
        'src/Commodity.js',
        'src/Inventory.js',
        'src/Offer.js',
        'src/LogicAction.js',
        'src/LogicCondition.js',
        'src/LogicResult.js',
        'src/LogicNode.js',
        'src/Logic.js',
        'src/Role.js',
        'src/Agent.js',
        'src/Economy.js'
        ],
        dest: 'build/economia.js'
      }
    },
    jshint: {
      beforeconcat: ['src/*.js'],
      afterconcat: ['build/economia.js']
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'build/economia.js',
        dest: 'build/economia.min.js'
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint')
  // Default task(s).
  grunt.registerTask('default', ['concat','uglify']);

};
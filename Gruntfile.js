'use strict';

module.exports = function(grunt) {

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');

	function init(params) {
		grunt.initConfig({
			uglify: {
				options: {
					mangle: false
				},
				build: {
					files:  {},
					src:    'src/gridy.js',
					dest:   'dist/gridy.min.js'
				}
			},
			cssmin: {
				build: {
					src: ['src/gridy.css'],
					dest: 'dist/gridy.min.css'
				}
			}
		});

		grunt.registerTask('default', ['cssmin', 'uglify:build']);
	}

	init({});
};
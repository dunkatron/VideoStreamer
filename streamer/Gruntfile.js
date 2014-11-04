module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        typescript: {
            base: {
                src: ['src/**/*.ts'],
                dest: 'js/',
                options: {
                    module: 'commonjs',
                    target: 'es5',
                    basePath: 'src',
                    sourceMap: true,
                    declaration: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-typescript');

    // Default task(s).
    grunt.registerTask('default', ['typescript']);
};
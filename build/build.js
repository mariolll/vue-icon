var fs = require('fs');
var xml2js = require('xml2js');
var path = require('path');
var parser = new xml2js.Parser();
var svgFolder = path.resolve(__dirname, '../src/svg/');
var svgJs = path.resolve(__dirname, '../src/svg.js');
var paths = {};
var queue = [];
const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const uglify = require('rollup-plugin-uglify');
const ejs = require('ejs');

const SVGO = require('svgo');
const svgo = new SVGO()

fs.readdir(svgFolder, (err, files) => {

    files.forEach(fileName => {

        queue.push(new Promise(function(resolve, reject) {

            fs.readFile(path.resolve(svgFolder, fileName), function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    svgo.optimize(data, svgodata => {
                        parser.parseString(svgodata.data, function(err, result) {
                            if (result.svg.path && result.svg.path.length) {
                                let pathItem = {
                                    path: result.svg.path.map(svgpath => {
                                        return svgpath.$.d;
                                    })
                                };
                                if (result.svg.$.viewBox != '0 0 1024 1024') {
                                    pathItem.viewBox = result.svg.$.viewBox;
                                }

                                paths[path.parse(fileName).name] = pathItem;
                            }
                            resolve()
                        });

                    });

                }
            });

        }));
    });

    Promise.all(queue).then(function() {
        fs.writeFile(svgJs, 'export default ' + JSON.stringify(paths), function(err, data) {
            build();
        });
    });
});


function build() {
    rollup.rollup({
        entry: path.resolve(__dirname, './demo.js'),
        plugins: [
            babel(), uglify()
        ],
        globals: {
            Vue: 'Vue'
        }
    }).then(function(bundle) {
        // Generate bundle + sourcemap
        var result = bundle.generate({
            // output format - 'amd', 'cjs', 'es', 'iife', 'umd'
            format: 'iife'
        });

        ejs.renderFile(path.resolve(__dirname, '../index.ejs'), { code: result.code, icons: Object.keys(paths) }, function(err, str) {
            fs.writeFile(path.resolve(__dirname, '../index.html'), str, function(err) {
                console.log('finish', path.resolve(__dirname, '../index.html'))
            });
        });
    });

    rollup.rollup({
        entry: path.resolve(__dirname, '../src/index.js'),
        plugins: [
            babel(), uglify()
        ]
    }).then(function(bundle) {
        var result = bundle.generate({
            format: 'cjs'
        });
        fs.writeFile(path.resolve(__dirname, '../dist/index.js'), result.code, function(err) {
            console.log('finish', path.resolve(__dirname, '../dist/index.js'))
        });
    });
}
const failPlugin = require('webpack-fail-plugin');
const fs = require('fs');
const path = require('path');
const ZipPlugin = require('zip-webpack-plugin');

// Enable --fxn=foo to build only that function.
let functionsToBuild = process.argv
    .filter(arg => /^--fxn=/.test(arg))
    .map(arg => arg.substring("--fxn=".length));
if (functionsToBuild.length === 0) {
    functionsToBuild = fs.readdirSync("./src/lambdas");
}
console.log(`Building ${functionsToBuild.join(", ")}`);

module.exports = functionsToBuild
    .map(fxn => ({
        entry: path.join(__dirname, 'src', 'lambdas', fxn, 'index.ts'),
        target: 'node',
        node: {
            // Allow these globals.
            __filename: false,
            __dirname: false
        },
        output: {
            path: path.join(__dirname, 'dist', fxn),
            filename: 'index.js',
            libraryTarget: 'commonjs2'
        },
        externals: {
            // These modules are already installed on the Lambda instance.
            'aws-sdk': 'aws-sdk',
            'awslambda': 'awslambda',
            'dynamodb-doc': 'dynamodb-doc',
            'imagemagick': 'imagemagick'
        },
        bail: true,
        resolve: {
            extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [['@babel/env', {targets: {node: '10.16'}}]],
                                plugins: [],
                                compact: false,
                                babelrc: false,
                                cacheDirectory: true
                            }
                        }
                    ]
                },
                {
                    test: /\.ts(x?)$/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [['@babel/env', {targets: {node: '10.16'}}]],
                                plugins: [],
                                compact: false,
                                babelrc: false,
                                cacheDirectory: true
                            }
                        },
                        'ts-loader'
                    ]
                },
                {
                    test: /\.json$/,
                    use: ['json-loader']
                }
            ]
        },
        plugins: [
            failPlugin,
            new ZipPlugin({
                path: path.join(__dirname, 'dist', fxn),
                pathPrefix: "",
                filename: `${fxn}.zip`
            })
        ]
    }));

const path = require('node:path');
const webpack = require('webpack');

const TerserPlugin = require("terser-webpack-plugin");

const _terser_options = { // https://github.com/terser/terser/tree/v5.3.8?tab=readme-ov-file#minify-options
    parse: false,
    compress: {
        drop_console: process.env.FOOSTACK_DEV == 'yes' ? false : true,
        keep_infinity: true
    },
    mangle: false,
    format: {
        ascii_only: false,
        beautify: false,
        braces: false,
        comments: false,
        ecma: false,
        indent_level: 4,
        indent_start: 0,
        inline_script: false,
        keep_numbers: true,
        keep_quoted_props: true,
        max_line_len: false,
        preamble: null,
        quote_keys: false,
        quote_style: 0,
        preserve_annotations: false,
        safari10: false,
        semicolons: false,
        shebang: false,
        webkit: false,
        wrap_iife: false,
        wrap_func_args: false
    },
    sourceMap: false,
    ecma: undefined,
    keep_classnames: true,
    keep_fnames: true,
    ie8: false,
    module: false,
    nameCache: null,
    safari10: false,
    toplevel: false
}

module.exports = [
    {
        name: 'blobparts',
        target: 'web',
        mode: 'production',
        devtool: false,
        entry: {
            socketio: './src/web/js/body/socketio.js'
        },
        output: {
            path: path.resolve(__dirname),
            filename: 'src/web/js/body/[name].bundle.js'
        },
        resolve: {
            fallback: {
                buffer: require.resolve('buffer/')
            }
        },
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: _terser_options,
                    extractComments: false
                })
            ]
        },
        plugins: [
          new webpack.ProvidePlugin({
              Buffer: ['buffer', 'Buffer'],
          })
        ]
    },
    {
        name: 'web',
        target: 'web',
        mode: 'production',
        devtool: false,
        entry: {
            header: './src/web/js/header.js',
            body: './src/web/js/body.js',
            styles: './src/web/css/styles.scss'
        },
        output: {
            path: path.resolve(__dirname),
            filename: 'src/web/js/[name].bundle.js'
        },
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    type: "asset/resource",
                    generator: {
                        filename: 'src/web/css/styles.bundle.css',
                    },
                    use: [
                        {
                            loader: 'sass-loader',
                            options: {
                                sassOptions: {
                                    outputStyle: 'compressed'
                                }
                            }
                        }
                    ],
                }
            ]
        },
        resolve: {
            fallback: {
                buffer: require.resolve('buffer/')
            }
        },
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: _terser_options,
                    extractComments: false
                })
            ]
        },
        plugins: [
          new webpack.ProvidePlugin({
              Buffer: ['buffer', 'Buffer'],
          })
        ]
    },
    {
        name: 'server',
        target: 'node',
        mode: 'production',
        devtool: false,
        entry: './src/server.js',
        output: {
            path: path.resolve(path.join(__dirname, 'src')),
            filename: "server.bundle.js"
        },
        node: {
            __dirname: false,   // if you don't put this: __dirname
            __filename: false,  // and __filename return blank or /   (don't remember, maybe related to pkg)
        },
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: _terser_options,
                    extractComments: false
                })
            ]
        },
        plugins: []
    }
];

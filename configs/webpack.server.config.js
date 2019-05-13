const webpack = require('webpack');
const merge = require('webpack-merge');
const path = require('path');
const opn = require('opn');
const nodeExternals = require('webpack-node-externals');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackShellPlugin = require('./plugin/webpack/webpack-shell-plugin.js');
const constants = require('./constants.js');

const { config } = constants;

// Get npm script
const TARGET = process.env.npm_lifecycle_event;

// Common config object
const common = {

    entry: path.resolve(constants.SERVER_DIR, 'server.js'),

    target: 'node',

    output: {
        filename: 'index.js',
        path: constants.DIST_DIR,
        publicPath: '/build/',
    },

    externals: [nodeExternals()],

    node: { __filename: false, __dirname: false },

    module: {
        rules: [
            {
                test: /\.jsx?/,
                loader: 'babel-loader',
                options: {
                    cacheDirectory: path.resolve(constants.WORK_DIR, 'node_modules/.cache/server/babel-loader'),
                    ...config.babelrc,
                },
            },
            {
                type: 'javascript/auto',
                test: /\.json/,
                loader: 'json-loader',
            },
            {
                test: /\.(png|svg|jpe?g|gif|ico)$/,
                loader: 'file-loader',
                options: {
                    name: '[name]-[md5:hash:hex:6].[ext]',
                    outputPath: 'images/',
                    emitFile: false,
                },
            },
            {
                test: /\.(s?css|sass)$/,
                loader: 'ignore-loader',
            },
        ],
    },

    resolve: {
        extensions: ['.js', '.jsx'],
        alias: {
            components: path.resolve(constants.APP_DIR, 'components'),
            reducers: path.resolve(constants.APP_DIR, 'redux/reducers'),
        },
    },

    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1,
        }),
    ],

    stats: {
        modules: false,
        children: false,
    },

};

if (TARGET !== 'build') {
    // Development mode
    module.exports = merge(common, {

        mode: 'development',

        devtool: 'eval-source-map',

        watch: true,
        watchOptions: {
            poll: true,
        },

        plugins: [
            new webpack.DefinePlugin(Object.assign({}, constants.GLOBALS, {
                'process.env': {
                    PORT: config.PORT,
                    SSR: process.env.SSR === 'true' || constants.GLOBALS.SSR,
                },
            })),
            new webpack.BannerPlugin({
                banner: 'require("source-map-support").install();',
                raw: true,
                entryOnly: false,
            }),
            new WebpackShellPlugin({
                path: path.resolve(constants.DIST_DIR, 'index.js'),
                afterFirstEmit: (proc) => {
                    // Open URL in the browser after server has started.
                    proc.on('message', (msg) => {
                        if (msg === 'ready') {
                            opn(constants.WEBPACK_LOCALHOST);
                        }
                    });
                },
                ssr: process.env.SSR === 'true' || constants.GLOBALS.SSR,
            }),
        ],

    });
}
else {
    // Production mode
    module.exports = merge(common, {

        mode: 'production',

        devtool: 'source-map',

        plugins: [
            new webpack.DefinePlugin(Object.assign({}, constants.GLOBALS, {
                'process.env': {
                    PORT: config.PORT,
                    NODE_ENV: JSON.stringify('production'),
                    SSR: true,
                },
            })),
            new CleanWebpackPlugin([constants.PROD_TEMPLATES_DIR], {
                root: constants.WORK_DIR,
                exclude: ['.gitkeep'],
            }),
            new CopyWebpackPlugin([{
                from: path.resolve(constants.DEV_TEMPLATES_DIR, 'prod'),
                to: constants.PROD_TEMPLATES_DIR,
            }]),
        ],

    });
}

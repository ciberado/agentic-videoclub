const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/client/index.tsx',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/client/index.html',
            filename: 'index.html',
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
        },
        port: 3000,
        hot: true,
        client: {
            webSocketURL: 'ws://localhost:3000/ws-hmr',  // Use different path for HMR
        },
        webSocketServer: {
            type: 'ws',
            options: {
                path: '/ws-hmr',  // Different path for webpack HMR
            },
        },
        proxy: {
            '/api': 'http://localhost:3001',
            '/ws': {
                target: 'http://localhost:3001',
                ws: true,
                changeOrigin: true,
            },
        },
    },
};
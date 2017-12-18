module.exports = {
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.(png|jpg|gif)$/,
                loader: 'url-loader',
                exclude: /node_modules/,
                options: {
                    limit: 8192,
                },
            },
        ],
    },
};

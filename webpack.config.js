const path = require("path");
module.exports = {
    mode: "development",
    context: __dirname,
    entry: "./src/index.ts",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "dist"),
        publicPath: "/dist/"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            },
            {
                test: /\.wgsl$/,
                use: {
                    loader: "ts-shader-loader"
                }
            }
        ]
    },
    
    resolve: {
        extensions: [".ts"]
    }
}
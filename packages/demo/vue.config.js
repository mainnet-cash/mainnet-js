const path = require(`path`);

module.exports = {
    // chainWebpack: (config) => {
    //     config.resolve.symlinks(false)
    //   },
    configureWebpack: {
        resolve: {
            symlinks: false,
            alias: {
                "@": path.resolve(__dirname, './src'),
                'vue$': 'vue/dist/vue.esm-bundler.js',
                vue: path.resolve(__dirname, `./node_modules/vue`)
            }
        },
        optimization: {
            splitChunks: {
              minSize: 50000,
              maxSize: 230000,
            }
          }
    },
    transpileDependencies: [
        'electrum-cash'
    ]
}
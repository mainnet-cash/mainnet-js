
module.exports = {
    configureWebpack: {
        resolve: {
            symlinks: false,
        },
    },
    transpileDependencies: [
        'electrum-cash'
    ]
}
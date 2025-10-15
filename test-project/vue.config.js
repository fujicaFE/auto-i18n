const AutoI18nPlugin = require('../lib/index.js')

module.exports = {
  transpileDependencies: [],
  
  configureWebpack: {
    plugins: [
      new AutoI18nPlugin({
        outputPath: './src/locales',
        sourceLanguage: 'zh',
        targetLanguages: ['en', 'zh-TW', 'ja'],
        transformCode: true,
        presets: {},
        ignoreComments: true,
        exclude: ['/node_modules/', /\.min\.js$/],
        logLevel: 'minimal'
      })
    ]
  }
}
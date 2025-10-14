const AutoI18nPlugin = require('../lib/index.js')

module.exports = {
  transpileDependencies: [],
  
  configureWebpack: {
    plugins: [
      new AutoI18nPlugin({
        outputPath: './src/locales',
        apiProvider: 'preset',
        sourceLanguage: 'zh',
        targetLanguages: ['en', 'zh-TW', 'ja'],
        // 始终转换代码 - 直接修改源文件
        transformCode: true,
        presets: {},
        ignoreComments: true,
        exclude: ['/node_modules/', /\.min\.js$/]
      })
    ]
  }
}
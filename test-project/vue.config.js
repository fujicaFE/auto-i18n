const AutoI18nPlugin = require('../lib/index.js');

module.exports = {
  transpileDependencies: [],

  configureWebpack: {
    plugins: [
      new AutoI18nPlugin({
        outputPath: './src/locales',
        sourceLanguage: 'zh',
        targetLanguages: ['en', 'zh-TW', 'ja'],
        include: ['src/**/*.vue', 'src/**/*.js'],
        exclude: [/\.min\.js$/, '/src/api/', '/src/apiV2/', 'src/locales/', '/src/settings.js', '/src/mixins/'],
        formatWithPrettier: true,
        globalFunctionName: 'i18n.t',
      })
    ]
  }
}
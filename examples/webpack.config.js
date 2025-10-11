// webpack.config.js 示例
const path = require('path');
const AutoI18nPlugin = require('@fujica/auto-i18n');

module.exports = {
  mode: 'development',
  entry: './src/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new AutoI18nPlugin({
      outputPath: './src/locales',
      apiProvider: 'baidu', // 使用百度翻译API
      apiKey: 'YOUR_BAIDU_APP_ID:YOUR_BAIDU_APP_SECRET',
      targetLanguages: ['en', 'zh-TW'],
      presets: {
        '欢迎使用': {
          'en': 'Welcome to use',
          'zh-TW': '歡迎使用'
        }
      }
    })
  ]
};

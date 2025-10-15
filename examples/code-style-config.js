// webpack.config.js 或 vue.config.js 中的配置示例
const AutoI18nPlugin = require('@fujica/auto-i18n');

module.exports = {
  // ... 其他配置
  plugins: [
    new AutoI18nPlugin({
      outputPath: './src/locales',
      transformCode: true,
      sourceLanguage: 'zh',
      targetLanguages: ['en', 'zh-TW'],
      
      // 🎯 代码风格配置 - 解决自动添加分号的问题
      codeStyle: {
        semicolons: false,  // 设置为 false 不添加分号
        quotes: 'single'    // 使用单引号
      },
      
      // 或者根据你项目的代码风格：
      // codeStyle: {
      //   semicolons: true,   // 如果你的项目使用分号
      //   quotes: 'double'    // 如果你的项目使用双引号
      // }
    })
  ]
};

/*
配置说明：

1. semicolons: boolean
   - false: 不自动添加分号（适合Vue CLI默认配置）
   - true: 自动添加分号（适合标准JS/TS项目）
   - 不配置: 自动检测原代码风格

2. quotes: 'single' | 'double'
   - 'single': 使用单引号（Vue推荐）
   - 'double': 使用双引号
   - 不配置: 自动检测原代码风格

常见项目配置：
- Vue CLI 项目: { semicolons: false, quotes: 'single' }
- React 项目: { semicolons: true, quotes: 'single' }
- Angular 项目: { semicolons: true, quotes: 'single' }
- 标准 JS: { semicolons: false, quotes: 'single' }
*/
# Auto-i18n Plugin 测试项目

## 项目简介

这是一个专门用于测试 auto-i18n webpack 插件的 Vue.js 项目。该项目包含丰富的中文内容，用于验证插件的自动国际化功能。

## 测试功能

### 1. 自动文本提取
- ✅ 从 Vue 组件模板中提取中文文本
- ✅ 从 JavaScript 代码中提取中文字符串
- ✅ 从计算属性和方法中提取中文内容

### 2. 预设翻译功能
- ✅ 默认使用内部预设翻译（不依赖外部 API）
- ✅ 繁体中文自动转换（使用 chinese-conv 库）
- ✅ 其他语言使用占位符格式：`[语言代码] 原文`

### 3. 文件生成
- ✅ 自动生成 `src/locales/zh-TW.json`（繁体中文）
- ✅ 自动生成 `src/locales/en.json`（英文占位符）
- ✅ 自动生成 `src/locales/ja.json`（日文占位符）

### 4. 实时更新
- ✅ 开发模式下实时检测新的中文文本
- ✅ 自动更新翻译文件
- ✅ 支持热重载

## 测试结果

### 构建测试
```bash
npm run build
```
**结果**: ✅ 成功检测到 137 个中文文本，生成完整的翻译文件

### 开发测试
```bash
npm run serve
```
**结果**: ✅ 开发服务器启动成功，实时检测文本变化

### 翻译质量测试

#### 繁体中文转换示例：
```json
{
  "项目统计": "項目統計",
  "处理文件数": "處理文件數",
  "关于自动国际化插件": "關於自動國際化插件",
  "自动识别Vue组件模板、脚本和JavaScript文件中的中文文本": "自動識別Vue組件模板、腳本和JavaScript文件中的中文文本"
}
```

#### 占位符格式示例：
```json
{
  "项目统计": "[en] 项目统计",
  "处理文件数": "[en] 处理文件数",
  "关于自动国际化插件": "[en] 关于自动国际化插件"
}
```

## 项目结构

```
test-project/
├── public/
├── src/
│   ├── components/
│   │   └── Stats.vue           # 统计组件（包含中文文本）
│   ├── views/
│   │   ├── Home.vue           # 首页（丰富的中文内容）
│   │   ├── About.vue          # 关于页面（项目介绍）
│   │   └── Contact.vue        # 联系页面（表单验证）
│   ├── utils/
│   │   └── common.js          # 工具函数（中文提示信息）
│   ├── locales/               # 自动生成的翻译文件
│   │   ├── en.json
│   │   ├── zh-TW.json
│   │   └── ja.json
│   ├── router/
│   ├── App.vue
│   └── main.js
├── vue.config.js              # 插件配置
└── package.json
```

## 插件配置

```javascript
const AutoI18nPlugin = require('../../lib/index.js');

module.exports = {
  configureWebpack: {
    plugins: [
      new AutoI18nPlugin({
        // 默认配置，使用内部预设翻译
        // apiProvider: 'preset' (默认值)
        // targetLanguages: ['en', 'zh-TW', 'ja']
        outputDir: './src/locales',
        include: /\.(vue|js)$/,
        exclude: /node_modules/
      })
    ]
  },
  transpileDependencies: []
};
```

## 访问测试

1. **构建测试**: `npm run build`
2. **开发测试**: `npm run serve`，然后访问 http://localhost:8080
3. **查看翻译文件**: 检查 `src/locales/` 目录下的 JSON 文件

## 测试页面内容

- **首页 (/)**: 包含项目介绍、功能列表、统计信息等丰富中文内容
- **关于页面 (/about)**: 详细的项目说明和技术特性
- **联系页面 (/contact)**: 表单验证和用户交互文本

## 验证要点

1. ✅ 插件能正确识别和提取所有中文文本
2. ✅ 繁体中文转换准确无误
3. ✅ 占位符格式符合预期
4. ✅ 文件生成路径正确
5. ✅ 开发模式实时更新功能正常
6. ✅ 构建过程无错误
7. ✅ 生成的翻译文件格式正确

## 技术规格

- **Vue.js**: 2.6.11
- **Vue CLI**: 4.5.0
- **Vue Router**: 3.2.0
- **Vue-i18n**: 8.22.0
- **Auto-i18n Plugin**: 最新版本

---

**测试状态**: ✅ 全部通过  
**最后更新**: 2024年10月11日  
**测试环境**: Windows + Node.js + Vue CLI 4.x
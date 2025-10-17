# @fujica/auto-i18n

![Release](https://github.com/fujica/auto-i18n/actions/workflows/release.yml/badge.svg)

A webpack plugin for automatic internationalization of Chinese text in Vue.js projects.

## Features

- Automatically extracts Chinese text from your source code
- Translates Chinese text to English and Traditional Chinese using various translation APIs
- Supports custom translation presets to override automatic translations
### Release Automation (简洁命令)
- Integrates with Vue i18n for seamless internationalization
- Transforms Chinese strings to $t() function calls (optional)
- Preserves original Chinese text as comments
- Configurable logging (logLevel, logThrottleMs) and build summary stats
- Include whitelist (glob / RegExp / substring) to restrict scanning + transforming
- Automatic plugin self-disable when translations complete (stopWhenComplete)
- Debug HMR mode to trace file rewrites and hashes (debugHMR)
- Safeguard: skip wrapping Chinese literals used only inside equality / inequality comparisons

## Installation

```bash
npm install --save-dev @fujica/auto-i18n
```

## Usage

### Basic Configuration

In your `webpack.config.js`:

```js
const AutoI18nPlugin = require('@fujica/auto-i18n');

module.exports = {
  // ... other webpack configurations
  plugins: [
    new AutoI18nPlugin({
      outputPath: './src/locales',
      apiProvider: 'none',  // 'baidu', 'google', 'deepl', 'youdao', or 'none'
      targetLanguages: ['en', 'zh-TW']
    })
  ]
};
```

### Full Configuration Options

```js
new AutoI18nPlugin({
  // Output directory for language JSON files
  outputPath: './src/locales',
  
  // Files to exclude (string or RegExp)
  exclude: [/node_modules/, 'vendor.js'], // 被排除文件既不会被扫描中文，也不会被写回（避免不必要的重写）

  // Files to include (whitelist). If set, only matched files are scanned/transformed.
  // Supports:
  //   - Glob patterns: 'src/**/*.vue'
  //   - Raw substrings: 'src/views/' (case sensitive)
  //   - RegExp objects: /src\/components\/\w+\.vue/
  // Example: include: ['src/**/*.vue', 'src/**/*.js', /src\/legacy\//]
  include: ['src/**/*.vue', 'src/**/*.js'],
  
  // Whether to ignore Chinese text in comments
  ignoreComments: true,
  
  // Translation API key (format depends on provider)
  apiKey: 'your-api-key',
  
  // Translation service provider
  apiProvider: 'baidu',  // 'baidu', 'google', 'deepl', 'youdao', or 'none'
  
  // Source language
  sourceLanguage: 'zh',
  
  // Target languages
  targetLanguages: ['en', 'zh-TW'],
  
  // Custom translation presets
  presets: {
    '你好': {
      'en': 'Hello',
      'zh-TW': '你好'
    },
    '世界': {
      'en': 'World',
      'zh-TW': '世界'
    }
  },
  
  // Whether to transform Chinese strings to i18n function calls
  transformCode: true,

  // Format transformed source using Prettier (semi: false, singleQuote: true 等默认内部配置)
  formatWithPrettier: true,

  // Global function to use in非Vue组件上下文（纯 JS 文件、data()/props 默认值等场景）
  // 默认值: 'window.$t'。在 Vue 组件 methods/computed 中仍使用 this.$t。
  globalFunctionName: 'window.$t',


  // Whether to skip machine translation for texts already existing in locale files
  // Still wraps with $t() in code
  skipExistingTranslation: true,

  // Logging level: 'silent' | 'minimal' | 'verbose'
  // minimal: only key phase summary logs
  logLevel: 'minimal',
  // Throttle interval (ms) for lifecycle logs (beforeCompile etc.)
  logThrottleMs: 5000

  // Enable enhanced hot-update diagnostics; logs rewrite reasons & file hashes
  debugHMR: false,

  // Auto stop plugin after a build where no new or missing keys exist
  stopWhenComplete: false
})
```

#### 字段补充说明

- `transformCode`: 为 true 时会尝试把源码里的中文直接替换为 `$t('原文')` 或 `window.$t('原文')` 调用（根据上下文判断）。
- `globalFunctionName`: 用于非 Vue this 上下文的调用，比如独立的 util.js，或者组件 `data()` 返回对象里的默认值、`props: { title: { default: '中文' } }` 等。可配置成 `i18n.t`、`window.$t`、`myI18n.translate` 等带点的链式名称，插件会自动拆分生成调用表达式。
- Vue 组件内的 methods / computed / 生命周期钩子中使用 `this.$t()`，其它场景用 `globalFunctionName`。
- `formatWithPrettier`: 打开后对最终写回的源码做 Prettier 格式化（当前内置 semi=false 去除分号，保证与无分号代码风格一致）。
- `exclude`: 匹配的文件既不参与中文提取，也不做包裹与写回（构建日志中的 scanned/updated 不包含它们）。
- `include`: 白名单；只处理匹配的文件（glob / RegExp / 字符串部分匹配），为空或未设时表示处理所有。先判定 include，再判定 exclude。
- 构建日志字段：`scanned`=扫描的 Vue 文件数；`updated`=实际发生写入修改的 Vue 文件数；`skipped`=未修改或已包裹无需重写；`chinese`=本次新增发现的中文片段计数；`newKeys`=新增到 locale 的 key 数；`totalKeys`=当前累积的全部 key 数。

#### 纯 JS 文件示例（使用 globalFunctionName）

```js
// src/utils/demo.js （非 Vue SFC）
// 假设 globalFunctionName: 'window.$t'

function greet() {
  const msg = '欢迎使用自动国际化插件' // 会被替换为 window.$t('欢迎使用自动国际化插件')
  console.log(msg)
}

export const labels = {
  ok: '确认',        // => window.$t('确认')
  cancel: '取消'     // => window.$t('取消')
}

export default greet
```

在上述示例中，由于文件不是典型的 Vue 组件（没有 `export default { name:..., data(){}, ... }` 结构），插件判定其为纯 JS，上下文使用 `globalFunctionName` 进行包裹。

#### 链式 globalFunctionName 示例

如果配置 `globalFunctionName: 'i18n.core.translate'`，源码中中文将产出：

```js
i18n.core.translate('你好')
```

插件会自动拆分 `i18n.core.translate` 为多层成员表达式构建调用，不需要手动引入点号解析逻辑。

#### 包裹策略快速总览

| 场景 | 使用的函数 |
|------|-------------|
| Vue methods/computed/生命周期钩子 | this.$t('中文') |
| Vue data() 返回对象 / props.default / 非 this 上下文 | globalFunctionName('中文') |
| 纯 JS / 工具模块 / 独立脚本 | globalFunctionName('中文') |
| 模板内文本（<template>） | $t('中文') （由编译阶段自动注入）|

#### 注意

1. `formatWithPrettier` 只对写回的文件生效；已被 `exclude` 的文件不会格式化。
2. 若文件内容在转换后与原内容一致（已包裹或无中文），插件避免重复写入以减少 HMR 循环。
3. `skipExistingTranslation` 为 true 时已有 key 不再发起机器翻译，但仍进行包裹保持调用统一。
4. 如果需要完全跳过某些第三方库或一次性脚本，请使用 `exclude`。
5. 跨平台路径：插件在匹配时会自动把路径中的 `\\` 转成 `/` 再做字符串或正则测试；推荐：
  - 使用正则：例如 `/src\/apiV2\//` 或 `/node_modules/`
  - 字符串片段：`'/src/apiV2/'`、`'node_modules'`
  - 避免依赖绝对盘符前缀，保持片段匹配可移植性。

### Quick Start (Minimal)

```js
// webpack.config.js
const AutoI18nPlugin = require('@fujica/auto-i18n')

module.exports = {
  plugins: [
    new AutoI18nPlugin({
      transformCode: true,
      logLevel: 'minimal'
    })
  ]
}
```

Build once, then you'll see locale JSON files created under `src/locales/` and a single summary log line (minimal mode) such as:

```
[auto-i18n:summary] Vue files scanned=12 updated=3 skipped=9 chinese=5 newKeys=2 totalKeys=156
```

### Release Notes

See [CHANGELOG.md](./CHANGELOG.md) for version history. Version 0.1.0 introduces:
* Vue SFC template + script Chinese extraction & auto wrapping `$t()`
* Optional direct source transformation (`transformCode`)
* Translation batching with skipExistingTranslation optimization
* Log levels (`silent|minimal|verbose`) + single final summary in minimal mode
* Key statistics: scanned / updated / skipped / chinese / newKeys / totalKeys
* Include whitelist (glob / substring / RegExp) for scope control
* `stopWhenComplete` auto-disable when no new or missing keys remain
* `debugHMR` mode for analyzing hot-update & avoiding loops
* Skip comparison-only Chinese string literals (e.g. `if (code !== '查询视频播放地址失败')` 保留原文避免影响逻辑)


## API Provider Configuration

### Baidu Translate

To use Baidu Translation API:
- Sign up for a Baidu Developer account
- Create an application to get app ID and secret
- Set `apiKey` to `'appId:appSecret'`

### Google Translate

To use Google Cloud Translation API:
- Get a Google Cloud API key
- Set `apiKey` to your API key

### DeepL

To use DeepL API:
- Sign up for a DeepL API account
- Get your authentication key
- Set `apiKey` to your DeepL authentication key

### Youdao Translate

To use Youdao Translation API:
- Sign up for a Youdao Developer account
- Create an application to get app key and secret
- Set `apiKey` to `'appKey:appSecret'`

## Output Format

The plugin generates JSON files for each target language:

```
/src/locales/
  ├── en.json
  └── zh-TW.json
```

Example content:

```json
// en.json
{
  "你好": "Hello",
  "世界": "World",
  "欢迎使用": "Welcome to use"
}

// zh-TW.json
{
  "你好": "你好",
  "世界": "世界",
  "欢迎使用": "歡迎使用"
}
```

## Integration with Vue i18n

Make sure you have Vue i18n set up in your project:

```js
import Vue from 'vue';
import VueI18n from 'vue-i18n';
import enMessages from './locales/en.json';
import zhTWMessages from './locales/zh-TW.json';

Vue.use(VueI18n);

const i18n = new VueI18n({
  locale: 'en', // default locale
  messages: {
    'en': enMessages,
    'zh-TW': zhTWMessages
  }
});

new Vue({
  i18n,
  // ...
}).$mount('#app');
```

## Test Project

This repository includes a comprehensive test project to demonstrate the plugin's capabilities. The test project is a full Vue.js application with rich Chinese content.

### Running the Test Project

```bash
# Build the plugin
npm run build

# Navigate to test project
cd test-project

# Install dependencies
npm install

# Link the local plugin
npm link @fujica/auto-i18n

# Run development server
npm run serve

# Test the plugin by building
npm run build
```

The test project includes:
- **Rich Chinese Content**: Vue templates, JavaScript code, user interactions
- **Multiple Pages**: Home, About, Contact pages with different content types
- **Various Vue Features**: Components, routing, forms, events
- **Real-world Scenarios**: User registration, form validation, data display

After running `npm run build`, check the generated files:
- `src/locales/` - Generated translation files
- `dist/` - Transformed code with `$t()` function calls
 - Console summary line (minimal mode):
   `[auto-i18n:summary] Vue files scanned=12 updated=3 skipped=9 chinese=5 newKeys=2`

For detailed information about the test project, see [test-project/README.md](./test-project/README.md).

## License

MIT
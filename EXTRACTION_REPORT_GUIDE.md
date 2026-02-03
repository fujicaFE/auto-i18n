# 提取报告功能说明

## 功能概述

auto-i18n 插件现已支持生成 **HTML 提取报告**，用于可视化展示提取到的中文文本及其来源。

## 使用方式

### 1. 启用报告生成（默认启用）

在 webpack 配置中：

```js
const AutoI18nPlugin = require('@fujica/auto-i18n');

module.exports = {
  plugins: [
    new AutoI18nPlugin({
      outputPath: './src/locales',
      enableExtractionReport: true,  // 启用提取报告（默认值）
      // ... 其他配置
    })
  ]
};
```

### 2. 禁用报告生成

```js
new AutoI18nPlugin({
  enableExtractionReport: false,  // 禁用提取报告
  // ... 其他配置
})
```

## 报告生成位置

报告自动生成在：

```
src/locales/.extraction-reports/extraction-report-{timestamp}.html
```

示例：
```
src/locales/.extraction-reports/extraction-report-2024-02-03T10-30-45-123Z.html
```

## 报告内容

### 1. 统计概览
- **总提取数量**：所有提取的中文文本总数
- **AST 识别数**：通过 Babel AST 解析识别的文本数
- **正则匹配数**：通过正则表达式回退方案识别的文本数
- **进度条**：直观展示两种方式的占比

### 2. AST 方式提取详表
展示通过 Babel AST 解析识别到的中文文本，按以下分类：

| 分类 | 说明 | 示例 |
|------|------|------|
| **StringLiteral** | JS/TS 字符串字面量 | `'你好'` / `"世界"` |
| **TemplateLiteral** | 模板字符串 | `` `欢迎${name}` `` |
| **JSXText** | JSX 文本节点 | `<div>提交</div>` |
| **JSXAttribute** | JSX 属性值 | `<Button label="保存" />` |

### 3. 正则方式提取详表
展示 AST 解析失败时，通过正则表达式回退方案识别到的中文文本。

通常适用于：
- 包含非标准语法的代码片段
- 某些特殊的代码构造

## 报告特点

✅ **响应式设计** - 支持桌面端和移动端查看
✅ **清晰的来源区分** - 彩色标签区分 AST 和正则方式
✅ **分类统计** - 按提取方式和文本类型分类展示
✅ **样式美观** - 现代化 UI 设计，渐变色背景
✅ **数据可视化** - 进度条显示 AST/正则比例
✅ **时间戳记录** - 报告生成时间精确到毫秒

## 报告生成时机

- **触发条件**：编译完成时（仅在第一次编译后生成）
- **输出日志**：`[auto-i18n:report] ✅ 提取报告已生成: <路径>`

## 常见场景

### 场景 1：验证提取准确性

打开生成的 HTML 报告，检查：
1. 提取的中文是否完整
2. 是否有误提取（如变量名、特殊字符）
3. AST 和正则方式的识别是否一致

### 场景 2：调试提取问题

如果某些中文没有被提取：
1. 查看报告确认是否存在
2. 检查是否被过滤规则排除（< 2 个中文字符、占比过低等）
3. 使用 `debugExtraction: true` 查看详细日志

### 场景 3：性能分析

通过报告了解：
- 有多少文本需要翻译
- AST 解析的覆盖率
- 是否有大量回退到正则方案的情况（可能表示代码语法问题）

## 配置示例

```js
const AutoI18nPlugin = require('@fujica/auto-i18n');

module.exports = {
  mode: 'development',
  entry: './src/main.ts',
  plugins: [
    new AutoI18nPlugin({
      outputPath: './src/locales',
      apiProvider: 'baidu',
      targetLanguages: ['en', 'zh-TW'],
      
      // 报告相关配置
      enableExtractionReport: true,    // 启用报告生成
      debugExtraction: false,           // 调试模式（详细日志）
      logLevel: 'minimal',              // 日志级别
      
      // ... 其他配置
    })
  ]
};
```

## HTML 报告示例结构

```
┌─────────────────────────────────────┐
│   🌐 中文提取分析报告                │
│   生成时间：2024-02-03 10:30:45     │
├─────────────────────────────────────┤
│  📊 统计卡片：                       │
│  • 总提取数：156                     │
│  • AST识别：140                      │
│  • 正则匹配：16                      │
├─────────────────────────────────────┤
│  ✨ AST 方式提取 (140 项)           │
│  ┌───────────────────────────────┐  │
│  │ 来源 │ 分类 │ 中文文本        │  │
│  ├───────────────────────────────┤  │
│  │ AST  │ String │ 你好世界      │  │
│  │ AST  │ Template │ 欢迎使用    │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  🔍 正则方式提取 (16 项)            │
│  ┌───────────────────────────────┐  │
│  │ 来源 │ 分类 │ 中文文本        │  │
│  ├───────────────────────────────┤  │
│  │ 正则 │ String │ 提交确认      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 故障排查

### 问题：报告没有生成

**可能原因：**
1. `enableExtractionReport` 设置为 `false`
2. 没有提取到任何中文文本
3. 输出目录权限不足

**解决方案：**
```js
new AutoI18nPlugin({
  enableExtractionReport: true,
  outputPath: './src/locales',  // 确保目录存在
  // 检查权限
})
```

### 问题：报告中的中文显示乱码

**解决方案：**
- 确保文件编码为 UTF-8
- 浏览器刷新并清除缓存
- 检查系统字体设置

### 问题：某些中文未出现在报告中

**可能原因：**
1. 被过滤规则排除（见下文）
2. 中文字符 < 2 个
3. 中文占比 < 10%

## 过滤规则

以下文本会被自动过滤，不会出现在报告中：

- ❌ HTML 标签内容：`<div>文本</div>`
- ❌ HTML 实体：`&nbsp;文本`
- ❌ Vue 插值表达式（纯表达式）：`{{ count }}`
- ❌ 过长文本（> 150 字符）
- ❌ 中文字符少于 2 个：`a中b`
- ❌ 中文占比低于 10%：`hello你好world123`

## 高级用法

### 生成多份报告对比

```js
// webpack.config.js - 开发环境
new AutoI18nPlugin({
  enableExtractionReport: true,
  debugExtraction: true,  // 详细日志
})
```

每次编译都会生成新的报告（带不同的时间戳），可用于：
- 对比代码变更前后的提取结果
- 追踪提取的历史变化
- 验证新增文本的识别

### 集成到 CI/CD

```bash
# 自动生成报告
npm run build

# 上传报告到构建产物
cp -r src/locales/.extraction-reports/* build/reports/
```

## 相关配置

| 配置项 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| `enableExtractionReport` | boolean | `true` | 启用提取报告 |
| `debugExtraction` | boolean | `false` | 启用提取调试日志 |
| `logLevel` | string | `'verbose'` | 日志级别 |
| `outputPath` | string | `'./src/locales'` | 输出目录（报告保存于此） |


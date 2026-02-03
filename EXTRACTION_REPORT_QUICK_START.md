# 提取报告功能 - 快速参考

## 🎯 功能概述

为 auto-i18n 插件添加了 **HTML 提取报告** 功能，自动生成中文文本提取的可视化分析报告。

```
编译完成
   ↓
自动生成 HTML 报告
   ↓
src/locales/.extraction-reports/extraction-report-{时间戳}.html
   ↓
浏览器打开查看统计和详细列表
```

---

## 🚀 快速开始

### 1. 启用报告（默认已启用）

```javascript
const AutoI18nPlugin = require('@fujica/auto-i18n');

module.exports = {
  plugins: [
    new AutoI18nPlugin({
      outputPath: './src/locales',
      enableExtractionReport: true,  // ✅ 自动生成报告
    })
  ]
};
```

### 2. 编译项目

```bash
npm run build
```

### 3. 查看报告

生成的报告位置：
```
src/locales/.extraction-reports/extraction-report-2024-02-03T10-30-45-123Z.html
                                                    ↑
                                              时间戳（每次都不同）
```

在浏览器中打开 `.html` 文件即可查看。

---

## 📊 报告内容

### 统计卡片
```
┌──────────────┬──────────────┬──────────────┐
│  总提取数    │  AST识别数   │  正则匹配数  │
│     156      │     140      │      16      │
│              │  ▓▓▓▓▓░░░░   │              │
└──────────────┴──────────────┴──────────────┘
        总数                     占比进度条
```

### 详细列表

#### ✨ AST 方式提取（140 项）
```
┌─────────┬──────────────┬──────────────┐
│  来源   │    分类      │  中文文本    │
├─────────┼──────────────┼──────────────┤
│  AST    │ StringLiteral│  你好世界    │
│  AST    │ TemplateLit  │  欢迎使用    │
│  AST    │ JSXAttribute │  提交确认    │
│  AST    │ JSXText      │  返回首页    │
└─────────┴──────────────┴──────────────┘
```

#### 🔍 正则方式提取（16 项）
```
┌─────────┬──────────────┬──────────────┐
│  来源   │    分类      │  中文文本    │
├─────────┼──────────────┼──────────────┤
│  正则   │ StringLiteral│  保存成功    │
│  正则   │ TemplateLit  │  操作失败    │
└─────────┴──────────────┴──────────────┘
```

---

## 🎨 报告特点

| 特点 | 描述 |
|------|------|
| 🎯 **来源区分** | 彩色徽章区分 AST 和正则方式 |
| 📱 **响应式** | 桌面端和移动端都能正常显示 |
| 🌈 **现代化设计** | 渐变色背景，视觉效果好 |
| ⚡ **轻量级** | 无外部依赖，加载速度快 |
| 🔤 **完整展示** | 所有提取的中文都有详细记录 |
| 📅 **时间戳** | 精确到毫秒的生成时间 |

---

## 🔧 配置选项

### 启用/禁用报告

```javascript
new AutoI18nPlugin({
  // 启用报告（默认）
  enableExtractionReport: true,
  
  // 或禁用报告
  enableExtractionReport: false,
})
```

### 配合其他选项

```javascript
new AutoI18nPlugin({
  outputPath: './src/locales',           // 报告保存位置
  enableExtractionReport: true,          // 启用报告
  debugExtraction: true,                 // 控制台详细日志
  logLevel: 'minimal',                   // 最少日志输出
})
```

---

## 📂 文件结构

```
项目根目录
├── src/
│   ├── locales/
│   │   ├── en.json
│   │   ├── zh-TW.json
│   │   └── .extraction-reports/         ← 报告存放位置
│   │       └── extraction-report-2024-02-03T10-30-45-123Z.html
│   │
│   ├── utils/
│   │   ├── extraction-reporter.ts       ← 新增：报告生成器
│   │   ├── chinese-extractor.ts         ← 改进：支持报告
│   │   └── ...
│   │
│   └── index.ts                         ← 改进：集成报告保存
│
└── webpack.config.js
```

---

## 📈 提取来源说明

### AST 方式（推荐）
✅ **优点**：
- 精确识别（通过 Babel 解析）
- 覆盖 Vue、JSX、TypeScript 等现代语法
- 识别精确度高

📍 **识别的位置**：
- `'字符串'` - 字符串字面量
- `` `模板` `` - 模板字符串
- `<div>文本</div>` - JSX 文本
- `label="标签"` - JSX 属性值

### 正则方式（回退）
⚠️ **什么时候使用**：
- AST 解析失败时自动回退
- 代码包含非标准语法时

📍 **识别原理**：
- 使用正则表达式扫描文本
- 提取引号中的中文内容

---

## 🔍 调试技巧

### 查看提取详细日志

```javascript
new AutoI18nPlugin({
  enableExtractionReport: true,
  debugExtraction: true,        // ← 启用详细日志
})
```

控制台输出示例：
```
[extractor][template-text] "你好"
[extractor][script-string] "世界"
[extractor][jsx-attr] "提交"
[extractor][rule] ratio <0.1 "hello"  // 被过滤的文本
```

### 验证报告生成

```bash
# Windows PowerShell
dir src/locales/.extraction-reports/

# Mac/Linux
ls -la src/locales/.extraction-reports/
```

---

## ⚙️ 工作流程

```
1️⃣ 编译开始
    ↓
2️⃣ buildModule 钩子
    ├─ 遍历每个文件
    ├─ ChineseExtractor.extract()
    ├─ 记录到 ExtractionReporter
    └─ 同时追踪来源（AST/正则）
    ↓
3️⃣ finishModules 钩子
    ├─ processCollectedTexts()
    ├─ transformAllSourceFiles()
    └─ rescanForMissingKeys()
    ↓
4️⃣ done 钩子
    ├─ reporter.generateReport()
    ├─ reporter.saveReport()
    └─ 输出日志：✅ 提取报告已生成
    ↓
5️⃣ 报告输出
    └─ src/locales/.extraction-reports/extraction-report-xxx.html
```

---

## 📝 输出示例

编译日志：
```
$ npm run build

> auto-i18n@0.1.11 build
> tsc

[auto-i18n:summary] Vue files scanned=12 chinese=8 newKeys=45 totalKeys=156
[auto-i18n:report] ✅ 提取报告已生成: src/locales/.extraction-reports/extraction-report-2024-02-03T10-30-45-123Z.html
```

---

## 🎯 常见问题

### Q1: 报告没有生成怎么办？

**A:** 检查以下项：
1. `enableExtractionReport` 是否为 `true`
2. 是否提取到了中文文本
3. `outputPath` 目录是否有写入权限

```javascript
// ✅ 正确配置
new AutoI18nPlugin({
  outputPath: './src/locales',
  enableExtractionReport: true,
})
```

### Q2: 某些中文为什么没有出现？

**A:** 可能被过滤规则排除：
- ❌ 中文字符 < 2 个
- ❌ 中文占比 < 10%
- ❌ 长度 > 150 字符
- ❌ 包含 HTML 标签

### Q3: AST 和正则的区别是什么？

**A:** 
- **AST**：精确的语法解析（首选）
- **正则**：在 AST 失败时的备选方案

如果 AST 占比低，说明代码中可能有语法问题。

---

## 📚 相关文档

- 详细使用指南：[EXTRACTION_REPORT_GUIDE.md](./EXTRACTION_REPORT_GUIDE.md)
- 实现细节：[EXTRACTION_REPORT_IMPLEMENTATION.md](./EXTRACTION_REPORT_IMPLEMENTATION.md)
- API 文档：见源代码注释

---

## ✨ 新增文件

```
src/utils/extraction-reporter.ts
├─ ExtractionReporter 类
├─ ExtractedItem 接口
└─ ExtractionReport 接口
```

## 💡 改进的文件

```
src/utils/chinese-extractor.ts
├─ 支持 ExtractionReporter
├─ 追踪 AST 提取来源
└─ 追踪正则提取来源

src/index.ts
├─ enableExtractionReport 配置
├─ saveExtractionReport() 方法
└─ done 钩子中调用保存
```

---

## 🎓 学习路径

1. **快速了解** → 阅读本文档
2. **详细学习** → 查看 EXTRACTION_REPORT_GUIDE.md
3. **深入研究** → 查看源代码和 EXTRACTION_REPORT_IMPLEMENTATION.md
4. **实际操作** → 在项目中启用并查看生成的报告


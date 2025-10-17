# Changelog

## Unreleased
### Planned / Ideas
- 回放模式: dryRun 预览将要包裹的差异。
- 更多跳过规则配置化 (comparison, switch-case, error sentinel)。
- 缓存 include 匹配结果提升 watch 性能。

## 0.1.11
### Added
- `include` 白名单支持 glob 与 RegExp，三阶段统一生效 (提取/转换/二次扫描)。
- 新增 `stopWhenComplete` 自动停用插件选项，国际化完成后减少开销。
- 新增比较跳过：中文字符串用于 `== === != !==` 判定时不转换，避免业务逻辑变更。
- 解析失败保护：在 debug 模式下解析失败直接跳过转换并输出简洁日志。

### Changed
- 默认 `transformCode: true`，自动包裹中文更便捷；可显式关闭以仅提取。
- glob 匹配使用相对路径与 minimatch，兼容 minimatch v9 ESM 导出。

### Fixed
- 修复 minimatch 导入非函数导致的运行期错误 (TypeError: minimatch is not a function)。
- 抑制非调试模式下的 AST 解析错误噪音；仅在需要时输出。

### Internal
- 增加 `matchesInclude()` 封装；返回新增/遗漏 key 计数，用于停用逻辑。
- 添加比较跳过测试 `comparison-skip.test.ts` (总测试数 25)。


## 0.1.10
### Added
- `exclude` 现已支持跨平台路径归一（统一用 `/` 进行匹配），同时在转换阶段也会跳过写回。
- 调试日志：开启 `debugExtraction` 时会输出被 exclude 跳过的文件路径。

### Changed
- README 增加 `globalFunctionName`、`formatWithPrettier`、包裹策略、路径匹配注意事项说明。

### Fixed
- 之前发布的编译产物缺失 exclude 重写阶段过滤，导致实际项目中排除规则不生效的问题。

### Pending
- 更多自动化测试覆盖 exclude 行为。

## 0.1.9
- 默认 `globalFunctionName` 切换为 `window.$t`（源码层面），可在配置中覆盖。
- 增加 `formatWithPrettier`（无分号 singleQuote 格式）。
- 写入文件与 locale JSON 时内容未变化会跳过，避免 HMR 循环。

## 0.1.8 及之前
- 初始自动提取、翻译、包裹核心功能。
# All notable changes to this project will be documented in this file.

## 0.1.7 - 2025-10-15

### Changed
- Relax Node.js engine requirement from >=18.0.0 to >=14.18.0 for broader compatibility.


## 0.1.0 - 2025-10-15

Initial public release.

### Added
- Automatic extraction of Chinese text from Vue Single File Components (.vue) and JS/TS modules.
- Optional direct code transformation wrapping Chinese literals with `$t()` (transformCode option).
- Translation service abstraction (supports presets and skipping existing translations via `skipExistingTranslation`).
- Locale file management with incremental merge & preservation of existing keys.
- Vue template handling: mixed text, attributes with Chinese, interpolation replacements, props default handling fallback to global i18n function.
- Logging system with `logLevel` (silent|minimal|verbose) and throttled lifecycle logs.
- Single summary output in minimal mode reporting: scanned / updated / skipped / chinese / newKeys / totalKeys.
- Key statistics and metrics aggregation across preprocessing + translation phases.

### Fixed
- Prevent duplicate preprocessing on multiple `beforeCompile` triggers.
- Guard against replacing object property keys with i18n call expressions (AST transform safety).

### Internal
- Structured file preprocessor (`FilePreprocessor`) with summaryOnly mode for non-verbose logging.
- Added exports map and type definitions for package consumers.

---

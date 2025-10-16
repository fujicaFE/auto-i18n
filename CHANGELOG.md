# Changelog

## 0.1.10 (Unreleased)
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
# Changelog

All notable changes to this project will be documented in this file.

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

# Changelog

All notable changes to this project will be documented in this file.

## 0.1.9 - 2025-10-15

### Changed
- Reverted default transformer behavior to conservative wrapping: only wrap Chinese text that already exists as a key in locale files.

### Added
- New option `wrapStrategy`: `'existing' | 'all'` (default: `existing`). Set to `all` to enable the aggressive behavior introduced in 0.1.8 (wrap every Chinese occurrence regardless of existing translations).

### Notes
- 0.1.8 aggressive behavior is now opt-in via `wrapStrategy: 'all'`.
- This reduces unintended template disruptions for first-time adopters while preserving a switch for exhaustive wrapping workflows.

## 0.1.8 - 2025-10-15

### Changed
- Transformer now wraps all Chinese text occurrences regardless of whether translations already exist (previous behavior only wrapped keys present in locale files). Ensures first pass captures every Chinese literal (including props default like '阿斯顿发送到').

### Notes
- Downstream translation saving still governed by `skipExistingTranslation`; wrapping不再依赖已存在翻译。
- If you prefer旧行为，可在后续版本添加可选策略（planned: wrapStrategy: 'existing' | 'all'）。


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

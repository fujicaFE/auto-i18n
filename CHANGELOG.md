# Changelog

All notable changes to this project will be documented in this file.

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

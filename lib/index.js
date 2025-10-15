"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const chinese_extractor_1 = require("./utils/chinese-extractor");
const translation_service_1 = require("./utils/translation-service");
const locale_file_manager_1 = require("./utils/locale-file-manager");
const render_detector_1 = require("./utils/render-detector");
const code_analyzer_1 = require("./utils/code-analyzer");
const file_preprocessor_1 = require("./utils/file-preprocessor");
// 内置 RawSource 实现，避免依赖 webpack-sources
class SimpleRawSource {
    constructor(source) {
        this._source = source;
    }
    source() {
        return this._source;
    }
    size() {
        return this._source.length;
    }
}
class AutoI18nPlugin {
    constructor(options) {
        var _a;
        this.processedTexts = new Set();
        this.isDevMode = false;
        this.compilationCount = 0;
        this.processedFiles = new Set();
        this.isProcessing = false;
        this.translationsProcessed = false;
        this.lastBeforeCompileLog = 0;
        this.metrics = { scannedVue: 0, updatedVue: 0, skippedVue: 0, chineseVue: 0, newKeys: 0 };
        this.hasPreprocessedVue = false;
        this.logOnceFlag = new Set();
        this.options = Object.assign({ outputPath: './src/locales', presets: {}, exclude: [], ignoreComments: true, apiKey: '', apiProvider: 'preset', sourceLanguage: 'zh', targetLanguages: ['en', 'zh-TW'], enableProductionAnalysis: false, skipExistingTranslation: true }, options);
        // 确保targetLanguages包含sourceLanguage
        const sourceLanguage = this.options.sourceLanguage || 'zh';
        const targetLanguages = this.options.targetLanguages || ['en', 'zh-TW'];
        if (!targetLanguages.includes(sourceLanguage)) {
            targetLanguages.unshift(sourceLanguage);
        }
        this.translationService = new translation_service_1.TranslationService({
            apiKey: this.options.apiKey,
            apiProvider: this.options.apiProvider,
            sourceLanguage: sourceLanguage,
            targetLanguages: targetLanguages,
            presets: this.options.presets || {}
        });
        this.localeFileManager = new locale_file_manager_1.LocaleFileManager(this.options.outputPath || './src/locales', targetLanguages, sourceLanguage);
        this.chineseExtractor = new chinese_extractor_1.ChineseExtractor({
            ignoreComments: this.options.ignoreComments
        });
        // 初始化新的工具类
        this.renderDetector = new render_detector_1.RenderDetector();
        this.codeAnalyzer = new code_analyzer_1.CodeAnalyzer();
        this.logLevel = this.options.logLevel || 'verbose';
        // summaryOnly: 在非 verbose 模式下，只输出最终汇总
        const summaryOnly = this.logLevel !== 'verbose';
        this.filePreprocessor = new file_preprocessor_1.FilePreprocessor(this.chineseExtractor, this.options.codeStyle, this.logLevel, this.logLevel === 'verbose', // perFileLog 仅在 verbose 下开启
        summaryOnly);
        this.logThrottleMs = (_a = this.options.logThrottleMs) !== null && _a !== void 0 ? _a : 5000;
    }
    log(level, domain, ...args) {
        if (this.logLevel === 'silent')
            return;
        if (this.logLevel === 'minimal' && level === 'verbose')
            return;
        const prefix = `[auto-i18n:${domain}]`;
        console.log(prefix, ...args);
    }
    logOnce(key, level, domain, ...args) {
        if (this.logOnceFlag.has(key))
            return;
        this.logOnceFlag.add(key);
        this.log(level, domain, ...args);
    }
    apply(compiler) {
        // 检测是否为开发模式
        this.isDevMode = compiler.options.mode === 'development' || compiler.options.watch || !!compiler.watchMode;
        // 兼容 webpack 4.x 和 5.x
        let RawSource;
        try {
            // webpack 5.x
            const { webpack } = compiler;
            if (webpack && webpack.sources) {
                RawSource = webpack.sources.RawSource;
            }
            else {
                // webpack 4.x
                RawSource = require('webpack-sources').RawSource;
            }
        }
        catch (error) {
            // 降级方案，使用我们自己的 SimpleRawSource 实现
            RawSource = SimpleRawSource;
            console.warn('AutoI18nPlugin: Could not find webpack-sources. Using fallback RawSource implementation.');
        }
        // 在编译开始前处理源文件，而不是处理编译后的资产
        compiler.hooks.compilation.tap('AutoI18nPlugin', (compilation) => {
            // 使用 buildModule 钩子处理每个模块
            compilation.hooks.buildModule.tap('AutoI18nPlugin', (module) => {
                // 只处理用户源文件，忽略 node_modules
                if (module.resource && !module.resource.includes('node_modules')) {
                    const resourcePath = module.resource;
                    // 避免重复处理相同文件
                    if (this.processedFiles.has(resourcePath)) {
                        return;
                    }
                    const ext = path_1.default.extname(resourcePath).toLowerCase();
                    // 只处理 .vue 和 .js/.ts 文件
                    if (ext === '.vue' || ext === '.js' || ext === '.ts') {
                        this.processSourceFile(resourcePath);
                        this.processedFiles.add(resourcePath);
                    }
                }
            });
            // 在所有模块处理完成后进行翻译和保存
            compilation.hooks.finishModules.tap('AutoI18nPlugin', (modules) => {
                // 异步处理，但不阻塞编译
                this.processCollectedTexts().catch(error => {
                    console.error('AutoI18nPlugin: Error processing collected texts:', error);
                });
            });
        });
        // 🔥 新增：在编译开始前直接预处理Vue文件
        if (this.options.transformCode) {
            compiler.hooks.beforeCompile.tap('AutoI18nPlugin', () => {
                // 已经处理过（或正在处理）直接跳过，确保只跑一次
                if (this.hasPreprocessedVue || this.isProcessing) {
                    this.log('verbose', 'lifecycle', '已标记/正在预处理，跳过本次 beforeCompile');
                    return;
                }
                // 仅首次编译（done 里才会 ++）
                if (this.compilationCount > 0) {
                    this.log('verbose', 'lifecycle', '非首次编译，跳过预处理');
                    return;
                }
                this.hasPreprocessedVue = true; // 立刻标记，防止短时间多次 beforeCompile 重入
                this.isProcessing = true;
                if (this.logLevel === 'verbose') {
                    const now = Date.now();
                    if (now - this.lastBeforeCompileLog > this.logThrottleMs) {
                        this.lastBeforeCompileLog = now;
                        this.log('minimal', 'lifecycle', 'beforeCompile - 开始直接预处理Vue文件');
                    }
                }
                this.filePreprocessor.processVueFilesDirectly(this.options.outputPath)
                    .then(stats => {
                    if (stats) {
                        this.metrics.scannedVue += stats.scanned;
                        this.metrics.updatedVue += stats.updated;
                        this.metrics.skippedVue += stats.skipped;
                        this.metrics.chineseVue += stats.chinese;
                    }
                    if (this.logLevel === 'verbose') {
                        this.log('minimal', 'lifecycle', 'Vue文件直接预处理完成');
                    }
                })
                    .catch(error => {
                    console.error('❌ AutoI18nPlugin: Vue文件预处理失败:', error);
                })
                    .finally(() => {
                    this.isProcessing = false;
                });
            });
        }
        // 在开发模式下，当编译完成时可以选择性保存翻译文件
        if (this.isDevMode) {
            compiler.hooks.done.tap('AutoI18nPlugin', () => {
                this.compilationCount++;
                // 只在第一次编译完成时处理，避免循环
                if (this.compilationCount === 1 && this.processedTexts.size > 0) {
                    this.log('verbose', 'dev', `cached ${this.processedTexts.size} translations for potential save`);
                }
                // 每次编译完成后重置处理状态（除了第一次）
                if (this.compilationCount > 1) {
                    this.processedFiles.clear();
                    this.log('verbose', 'dev', '重置文件处理状态以准备下次编译');
                }
                // 输出汇总（仅首次 compile 后）
                if (this.compilationCount === 1) {
                    // 只输出一次最终汇总；所有模式统一在此输出（前面 summaryOnly 已抑制中间日志）
                    this.outputSummary();
                }
            });
        }
        // 使用emit钩子来捕获最终生成的代码，包括Vue的render函数
        // 只有在启用生产环境分析时才执行
        if (this.options.enableProductionAnalysis) {
            compiler.hooks.emit.tap('AutoI18nPlugin', (compilation) => {
                console.log('🎯 AutoI18nPlugin: emit钩子 - 开始分析最终生成的资产');
                const translations = this.loadTranslationsFromMemory();
                // 遍历所有生成的资产
                for (const [filename, asset] of Object.entries(compilation.assets)) {
                    // 只处理JavaScript文件
                    if (filename.endsWith('.js')) {
                        console.log(`📄 AutoI18nPlugin: 分析JavaScript资产 - ${filename}`);
                        // 获取资产的源代码
                        const source = asset.source();
                        if (typeof source === 'string') {
                            // 检查是否包含Vue render函数的特征
                            const renderResult = this.renderDetector.checkForRenderInEmittedCode(source);
                            if (renderResult.hasRenderFunction) {
                                console.log(`🎨 AutoI18nPlugin: 在 ${filename} 中发现render函数！`);
                                // 检查render函数中是否包含中文
                                const chineseRegex = /[\u4e00-\u9fff]/;
                                if (chineseRegex.test(source)) {
                                    console.log(`🈚 AutoI18nPlugin: ${filename} 中的render函数包含中文文本！`);
                                    // 在这里我们可以进行处理
                                    this.codeAnalyzer.processRenderFunctionInEmit(source, filename, translations);
                                }
                            }
                        }
                    }
                }
                console.log('✅ AutoI18nPlugin: emit钩子分析完成');
            });
        }
        else {
            this.log('minimal', 'analysis', '生产环境分析已禁用 (enableProductionAnalysis: false)');
        }
    }
    async processSourceFile(filePath) {
        try {
            const fs = require('fs');
            const source = fs.readFileSync(filePath, 'utf-8');
            const ext = path_1.default.extname(filePath).toLowerCase();
            // 提取中文文本
            const chineseTexts = ext === '.vue'
                ? this.chineseExtractor.extractFromVueFile(source)
                : this.chineseExtractor.extractFromJsFile(source);
            // 添加到集合中
            chineseTexts.forEach((text) => this.processedTexts.add(text));
        }
        catch (error) {
            console.error(`AutoI18nPlugin: Error processing source file ${filePath}`, error);
        }
    }
    async processCollectedTexts() {
        if (this.translationsProcessed)
            return;
        if (this.processedTexts.size === 0)
            return;
        await this.localeFileManager.loadTranslations();
        const allTexts = Array.from(this.processedTexts);
        const newTexts = allTexts.filter(text => !this.localeFileManager.hasTranslation(text));
        let newlyTranslated = [];
        if (newTexts.length > 0) {
            this.log('minimal', 'translate', `new texts: ${newTexts.length}`);
            this.metrics.newKeys += newTexts.length;
            if (this.options.skipExistingTranslation !== false) {
                this.hasPreprocessedVue = true;
                try {
                    newlyTranslated = await this.translationService.translateBatch(newTexts);
                    this.localeFileManager.addTranslations(newlyTranslated);
                }
                catch (e) {
                    console.error('[auto-i18n] translate error', e);
                }
            }
        }
        const existingUsed = this.localeFileManager.getTranslations(allTexts.filter(t => !newTexts.includes(t)));
        const toSave = [...existingUsed, ...newlyTranslated];
        if (toSave.length > 0) {
            this.localeFileManager.saveTranslations(toSave);
            // totalKeys: 当前翻译文件累积总 key 数；processed: 本次涉及（新增+已存在使用）数量
            const totalKeys = this.localeFileManager.getTotalKeyCount();
            const processedCount = toSave.length;
            this.log('minimal', 'translate', `saved locales: keys(total)=${totalKeys} processed=${processedCount} new=${newlyTranslated.length}`);
        }
        this.translationsProcessed = true;
        this.processedTexts.clear();
    }
    outputSummary() {
        var _a, _b, _c;
        // totalKeys: 当前翻译文件总 key 数（加载后）
        const totalKeys = (_c = (_b = (_a = this.localeFileManager).getTotalKeyCount) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : 0;
        this.log('minimal', 'summary', `Vue files scanned=${this.metrics.scannedVue} updated=${this.metrics.updatedVue} skipped=${this.metrics.skippedVue} chinese=${this.metrics.chineseVue} newKeys=${this.metrics.newKeys} totalKeys=${totalKeys}`);
    }
    loadTranslationsFromMemory() {
        const translations = {};
        try {
            const fs = require('fs');
            const localesDir = path_1.default.resolve(this.options.outputPath);
            if (!fs.existsSync(localesDir)) {
                return translations;
            }
            const files = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json'));
            for (const file of files) {
                const locale = path_1.default.basename(file, '.json');
                const filePath = path_1.default.join(localesDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const localeTranslations = JSON.parse(content);
                    for (const [key, translation] of Object.entries(localeTranslations)) {
                        if (!translations[key]) {
                            translations[key] = {};
                        }
                        translations[key][locale] = translation;
                    }
                }
                catch (error) {
                    console.warn('AutoI18nPlugin: Failed to load', filePath);
                }
            }
        }
        catch (error) {
            console.warn('AutoI18nPlugin: Failed to load translations:', error.message);
        }
        return translations;
    }
}
// CommonJS 模块导出，webpack插件需要这种格式
module.exports = AutoI18nPlugin;

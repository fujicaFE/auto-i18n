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
        this.translationsProcessed = false;
        this.metrics = { scannedVue: 0, updatedVue: 0, skippedVue: 0, chineseVue: 0, newKeys: 0 };
        this.pluginDisabled = false;
        this.logOnceFlag = new Set();
        this.options = Object.assign({ outputPath: './src/locales', presets: {}, exclude: [], ignoreComments: true, debugExtraction: false, apiKey: '', apiProvider: 'preset', sourceLanguage: 'zh', targetLanguages: ['en', 'zh-TW'], enableProductionAnalysis: false, skipExistingTranslation: true, formatWithPrettier: false, transformCode: true, globalFunctionName: 'window.$t', debugHMR: false }, options);
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
        this.localeFileManager.pluginOptions = this.options;
        this.chineseExtractor = new chinese_extractor_1.ChineseExtractor({
            ignoreComments: this.options.ignoreComments,
            debugExtraction: this.options.debugExtraction
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
    matchesInclude(filepath) {
        const patterns = this.options.include || [];
        if (!patterns.length)
            return true;
        let mm = require('minimatch');
        // 支持 minimatch v9 ESM default 导出
        if (mm && typeof mm !== 'function' && typeof mm.minimatch === 'function') {
            mm = mm.minimatch;
        }
        else if (mm && mm.default && typeof mm.default === 'function') {
            mm = mm.default;
        }
        const projectRoot = process.cwd().replace(/\\/g, '/');
        const normalized = filepath.replace(/\\/g, '/');
        // 计算相对路径以便按照常规 glob （通常用户写 src/**/*.vue）匹配
        const relative = normalized.startsWith(projectRoot) ? normalized.slice(projectRoot.length + 1) : normalized;
        for (const p of patterns) {
            if (typeof p === 'string') {
                const hasGlob = /[*?\[\]{}]/.test(p);
                if (hasGlob) {
                    if (mm(relative, p, { dot: true }) || mm(normalized, p, { dot: true }))
                        return true;
                }
                else {
                    if (relative.includes(p) || normalized.includes(p))
                        return true;
                }
            }
            else if (p instanceof RegExp) {
                if (p.test(relative) || p.test(normalized))
                    return true;
            }
        }
        return false;
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
            // 每次编译都重新收集（processedFiles 仅用于当前编译周期去重）
            compilation.hooks.buildModule.tap('AutoI18nPlugin', (module) => {
                if (this.pluginDisabled)
                    return;
                if (!module.resource || module.resource.includes('node_modules'))
                    return;
                const resourcePath = module.resource;
                const ext = path_1.default.extname(resourcePath).toLowerCase();
                if (!['.vue', '.js', '.ts'].includes(ext))
                    return;
                if (!this.matchesInclude(resourcePath))
                    return;
                if (this.processedFiles.has(resourcePath))
                    return;
                this.processSourceFile(resourcePath);
                this.processedFiles.add(resourcePath);
            });
            compilation.hooks.finishModules.tap('AutoI18nPlugin', async () => {
                try {
                    if (this.pluginDisabled)
                        return;
                    const newCount = await this.processCollectedTexts();
                    await this.transformAllSourceFiles();
                    const missingCount = await this.rescanForMissingKeys();
                    if (this.options.stopWhenComplete && newCount === 0 && missingCount === 0) {
                        this.pluginDisabled = true;
                        this.log('minimal', 'lifecycle', '国际化已完成：没有新增或遗漏中文，自动停止后续处理 (stopWhenComplete=true)');
                    }
                }
                catch (e) {
                    console.error('[auto-i18n] finishModules error', e);
                }
            });
        });
        // 🔥 新增：在编译开始前直接预处理Vue文件
        // 移除旧的仅首次 beforeCompile 预处理逻辑；统一在 finishModules 后处理
        // 在开发模式下，当编译完成时可以选择性保存翻译文件
        compiler.hooks.done.tap('AutoI18nPlugin', () => {
            this.compilationCount++;
            this.processedFiles.clear(); // 为下一轮编译重新收集
            this.translationsProcessed = false; // 允许增量新增翻译
            this.outputSummary();
        });
        // // 使用emit钩子来捕获最终生成的代码，包括Vue的render函数
        // // 只有在启用生产环境分析时才执行
        // if (this.options.enableProductionAnalysis) {
        //   compiler.hooks.emit.tap('AutoI18nPlugin', (compilation: any) => {
        //     console.log('🎯 AutoI18nPlugin: emit钩子 - 开始分析最终生成的资产')
        //     const translations = this.loadTranslationsFromMemory();
        //     // 遍历所有生成的资产
        //     for (const [filename, asset] of Object.entries(compilation.assets)) {
        //       // 只处理JavaScript文件
        //       if (filename.endsWith('.js')) {
        //         console.log(`📄 AutoI18nPlugin: 分析JavaScript资产 - ${filename}`)
        //         // 获取资产的源代码
        //         const source = (asset as any).source();
        //         if (typeof source === 'string') {
        //           // 检查是否包含Vue render函数的特征
        //           const renderResult = this.renderDetector.checkForRenderInEmittedCode(source);
        //           if (renderResult.hasRenderFunction) {
        //             console.log(`🎨 AutoI18nPlugin: 在 ${filename} 中发现render函数！`)
        //             // 检查render函数中是否包含中文
        //             const chineseRegex = /[\u4e00-\u9fff]/;
        //             if (chineseRegex.test(source)) {
        //               console.log(`🈚 AutoI18nPlugin: ${filename} 中的render函数包含中文文本！`)
        //               // 在这里我们可以进行处理
        //               this.codeAnalyzer.processRenderFunctionInEmit(source, filename, translations);
        //             }
        //           }
        //         }
        //       }
        //     }
        //     console.log('✅ AutoI18nPlugin: emit钩子分析完成')
        //   });
        // } else {
        //   this.log('minimal', 'analysis', '生产环境分析已禁用 (enableProductionAnalysis: false)')
        // }
    }
    async transformAllSourceFiles() {
        var _a;
        if (!this.options.transformCode)
            return;
        if (this.pluginDisabled)
            return;
        // 加载最新翻译映射
        const translationsMap = this.loadTranslationsFromMemory();
        const fs = require('fs');
        const crypto = require('crypto');
        const glob = require('glob');
        const root = process.cwd();
        let files = glob.sync('**/*.{vue,js,ts}', { cwd: root, absolute: true, ignore: ['**/node_modules/**'] });
        files = files.filter(f => this.matchesInclude(f));
        if (!files.length)
            return;
        const { Transformer } = require('./utils/transformer');
        const transformer = new Transformer({
            functionName: '$t',
            globalFunctionName: this.options.globalFunctionName || 'i18n.t',
            quotes: ((_a = this.options.codeStyle) === null || _a === void 0 ? void 0 : _a.quotes) || 'single',
            semicolons: false
        });
        const chineseRegex = /[\u4e00-\u9fff]/;
        const excludePatterns = this.options.exclude || [];
        // 规范化路径，统一使用正斜杠，方便跨平台匹配
        const normalizePath = (fp) => fp.replace(/\\/g, '/');
        const shouldExclude = (filepath) => {
            if (!excludePatterns.length)
                return false;
            const normalized = normalizePath(filepath);
            for (const p of excludePatterns) {
                if (typeof p === 'string') {
                    // 同时测试原始与规范化路径，字符串片段不建议以**开头结尾，这里简单包含匹配
                    if (normalized.includes(p) || filepath.includes(p))
                        return true;
                }
                else if (p instanceof RegExp) {
                    if (p.test(normalized) || p.test(filepath))
                        return true;
                }
            }
            return false;
        };
        for (const file of files) {
            try {
                const ext = path_1.default.extname(file).toLowerCase();
                const source = fs.readFileSync(file, 'utf-8');
                const beforeHash = crypto.createHash('sha1').update(source).digest('hex');
                const base = path_1.default.basename(file);
                if (['vue.config.js', 'webpack.config.js', 'jest.config.js', 'tsconfig.json'].includes(base))
                    continue;
                if (shouldExclude(file)) {
                    if (this.options.debugExtraction) {
                        this.log('minimal', 'exclude', `skip file by exclude: ${file}`);
                    }
                    continue; // 跳过 exclude 匹配文件，不重写
                }
                if (!chineseRegex.test(source) && !/\b\$t\(|i18n\.t\(/.test(source))
                    continue;
                const transformed = transformer.transform(source, translationsMap);
                if (transformed !== source) {
                    let finalCode = transformed;
                    if (this.options.formatWithPrettier) {
                        try {
                            const prettier = require('prettier');
                            const formatOptions = { semi: false, singleQuote: true, parser: ext === '.vue' ? 'vue' : (ext === '.ts' ? 'typescript' : 'babel') };
                            // Prettier 3 的 format 返回 Promise，需要 await
                            const maybePromise = prettier.format(finalCode, formatOptions);
                            finalCode = typeof (maybePromise === null || maybePromise === void 0 ? void 0 : maybePromise.then) === 'function' ? await maybePromise : maybePromise;
                        }
                        catch (e) {
                            this.log('minimal', 'format', `Prettier 格式化失败(${base}): ${e.message}`);
                            finalCode = transformed; // 回退原始转换代码
                        }
                    }
                    if (typeof finalCode !== 'string') {
                        finalCode = String(finalCode);
                    }
                    // 避免开发模式下反复写入触发循环热更新：仅在内容有差异时写
                    if (finalCode !== source) {
                        // debugHMR: 输出差异信息
                        if (this.options.debugHMR) {
                            const afterHash = crypto.createHash('sha1').update(finalCode).digest('hex');
                            const onlyWhitespace = source.replace(/[ \t]+/g, '').replace(/\r?\n/g, '\n') === finalCode.replace(/[ \t]+/g, '').replace(/\r?\n/g, '\n');
                            const logLine = `[HMR] rewrite ${file} before=${beforeHash} after=${afterHash} whitespaceOnly=${onlyWhitespace}`;
                            this.log('minimal', 'hmr', logLine);
                            try {
                                fs.appendFileSync(path_1.default.join(root, 'auto-i18n-hmr-debug.log'), logLine + "\n");
                            }
                            catch (_b) { }
                        }
                        fs.writeFileSync(file, finalCode, 'utf-8');
                    }
                    else if (this.options.debugHMR) {
                        const skipHash = crypto.createHash('sha1').update(source).digest('hex');
                        const logLine = `[HMR] skip-write identical ${file} hash=${skipHash}`;
                        this.log('minimal', 'hmr', logLine);
                        try {
                            fs.appendFileSync(path_1.default.join(root, 'auto-i18n-hmr-debug.log'), logLine + "\n");
                        }
                        catch (_c) { }
                    }
                }
                else if (this.options.debugHMR) {
                    const unchangedHash = crypto.createHash('sha1').update(source).digest('hex');
                    const logLine = `[HMR] no-transform ${file} hash=${unchangedHash}`;
                    this.log('minimal', 'hmr', logLine);
                    try {
                        fs.appendFileSync(path_1.default.join(root, 'auto-i18n-hmr-debug.log'), logLine + "\n");
                    }
                    catch (_d) { }
                }
            }
            catch (e) {
                console.warn('[auto-i18n] transform file failed', file, e.message);
            }
        }
    }
    async rescanForMissingKeys() {
        if (this.pluginDisabled)
            return 0;
        const fs = require('fs');
        const glob = require('glob');
        const root = process.cwd();
        let files = glob.sync('**/*.{vue,js,ts}', { cwd: root, absolute: true, ignore: ['**/node_modules/**'] });
        files = files.filter(f => this.matchesInclude(f));
        if (!files.length)
            return;
        await this.localeFileManager.loadTranslations();
        const existingSet = new Set();
        const existingTranslations = this.localeFileManager.getTranslations();
        for (const tr of existingTranslations)
            existingSet.add(tr.source);
        const newlyFound = [];
        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                const chineseTexts = content.includes('<template>') && content.includes('</template>')
                    ? this.chineseExtractor.extractFromVueFile(content)
                    : this.chineseExtractor.extractFromJsFile(content);
                for (const txt of chineseTexts) {
                    if (!existingSet.has(txt)) {
                        newlyFound.push(txt);
                        existingSet.add(txt);
                    }
                }
            }
            catch (_a) { }
        }
        if (!newlyFound.length)
            return 0;
        this.log('minimal', 'rescan', `found missing chinese keys=${newlyFound.length}`);
        try {
            const translations = await this.translationService.translateBatch(newlyFound);
            this.localeFileManager.addTranslations(translations);
            this.localeFileManager.saveTranslations(translations);
            this.log('minimal', 'rescan', 'missing keys saved');
        }
        catch (e) {
            console.error('[auto-i18n] rescan translate error', e);
        }
        return newlyFound.length;
    }
    async processSourceFile(filePath) {
        try {
            const fs = require('fs');
            // 处理可能包含 loader query 的资源路径 (例如 Component.vue?vue&type=script)
            if (filePath.includes('.vue?')) {
                const purePath = filePath.split('?')[0];
                if (fs.existsSync(purePath))
                    filePath = purePath;
            }
            const source = fs.readFileSync(filePath, 'utf-8');
            const ext = path_1.default.extname(filePath).toLowerCase();
            // 提取中文文本
            const chineseTexts = ext === '.vue'
                ? this.chineseExtractor.extractFromVueFile(source)
                : this.chineseExtractor.extractFromJsFile(source);
            // 添加到集合中
            chineseTexts.forEach((text) => this.processedTexts.add(text));
            if (ext === '.vue') {
                this.metrics.scannedVue++;
                if (chineseTexts.length)
                    this.metrics.chineseVue++;
            }
        }
        catch (error) {
            console.error(`AutoI18nPlugin: Error processing source file ${filePath}`, error);
        }
    }
    async processCollectedTexts() {
        if (this.translationsProcessed)
            return;
        if (this.processedTexts.size === 0)
            return 0;
        await this.localeFileManager.loadTranslations();
        const allTexts = Array.from(this.processedTexts);
        const newTexts = allTexts.filter(text => !this.localeFileManager.hasTranslation(text));
        let newlyTranslated = [];
        if (newTexts.length > 0) {
            this.log('minimal', 'translate', `new texts: ${newTexts.length}`);
            this.metrics.newKeys += newTexts.length;
            if (this.options.skipExistingTranslation !== false) {
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
        const newKeyCount = this.metrics.newKeys;
        this.processedTexts.clear();
        return newKeyCount;
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

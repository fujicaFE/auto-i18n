"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const chinese_extractor_1 = require("./utils/chinese-extractor");
const translation_service_1 = require("./utils/translation-service");
const locale_file_manager_1 = require("./utils/locale-file-manager");
const file_preprocessor_1 = require("./utils/file-preprocessor");
/**
 * 兼容 webpack 4.x 的 RawSource 降级实现
 * 当无法加载 webpack-sources 时使用此实现
 */
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
/**
 * 自动国际化 Webpack 插件
 *
 * 功能：
 * - 自动扫描中文文本
 * - 调用翻译 API 生成多语言文件
 * - 将中文转换为 i18n 函数调用
 * - 支持预设词汇和翻译缓存
 */
class AutoI18nPlugin {
    /**
     * 构造函数：初始化插件配置和工具类
     */
    constructor(options) {
        var _a;
        // ============ 内部状态 ============
        /** 收集到的中文文本集合 */
        this.processedTexts = new Set();
        /** 是否为开发模式 */
        this.isDevMode = false;
        /** 编译次数计数 */
        this.compilationCount = 0;
        /** 当前编译周期已处理的文件 */
        this.processedFiles = new Set();
        /** 是否已处理翻译 */
        this.translationsProcessed = false;
        /** 编译统计指标 */
        this.metrics = { scannedVue: 0, updatedVue: 0, skippedVue: 0, chineseVue: 0, newKeys: 0 };
        /** 插件是否已禁用（国际化完成时自动禁用） */
        this.pluginDisabled = false;
        /**
         * 仅输出一次的日志（防止重复输出）
         */
        this.logOnceFlag = new Set();
        // 合并用户配置和默认配置
        this.options = Object.assign({ outputPath: './src/locales', presets: {}, exclude: [], ignoreComments: true, debugExtraction: false, apiKey: '', apiProvider: 'preset', sourceLanguage: 'zh', targetLanguages: ['en', 'zh-TW'], enableProductionAnalysis: false, skipExistingTranslation: true, formatWithPrettier: false, transformCode: true, globalFunctionName: 'window.$t', debugHMR: false }, options);
        // 确保目标语言列表包含源语言
        const sourceLanguage = this.options.sourceLanguage || 'zh';
        const targetLanguages = this.options.targetLanguages || ['en', 'zh-TW'];
        if (!targetLanguages.includes(sourceLanguage)) {
            targetLanguages.unshift(sourceLanguage);
        }
        // 初始化翻译服务
        this.translationService = new translation_service_1.TranslationService({
            apiKey: this.options.apiKey,
            apiProvider: this.options.apiProvider,
            sourceLanguage: sourceLanguage,
            targetLanguages: targetLanguages,
            presets: this.options.presets || {}
        });
        // 初始化语言文件管理器
        this.localeFileManager = new locale_file_manager_1.LocaleFileManager(this.options.outputPath || './src/locales', targetLanguages, sourceLanguage);
        this.localeFileManager.pluginOptions = this.options;
        // 初始化中文提取器
        this.chineseExtractor = new chinese_extractor_1.ChineseExtractor({
            ignoreComments: this.options.ignoreComments,
            debugExtraction: this.options.debugExtraction
        });
        // 启用提取报告生成（可选）
        const enableExtractReport = this.options.enableExtractionReport !== false;
        this.chineseExtractor.enableReporting(enableExtractReport);
        // 配置日志系统
        this.logLevel = this.options.logLevel || 'verbose';
        const summaryOnly = this.logLevel !== 'verbose';
        // 初始化文件预处理器
        this.filePreprocessor = new file_preprocessor_1.FilePreprocessor(this.chineseExtractor, this.options.codeStyle, this.logLevel, this.logLevel === 'verbose', summaryOnly);
        this.logThrottleMs = (_a = this.options.logThrottleMs) !== null && _a !== void 0 ? _a : 5000;
    }
    // ============ 工具方法 ============
    /**
     * 检查文件路径是否匹配 include 白名单配置
     * @param filepath 文件路径
     * @returns 是否匹配
     */
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
        const relative = normalized.startsWith(projectRoot)
            ? normalized.slice(projectRoot.length + 1)
            : normalized;
        // 逐个检查模式
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
    /**
     * 输出日志
     * @param level 日志级别
     * @param domain 日志域名
     * @param args 日志内容
     */
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
    // ============ Webpack 钩子 ============
    /**
     * Webpack 插件入口点
     * 注册各阶段的编译钩子
     */
    apply(compiler) {
        // 检测是否为开发模式
        this.isDevMode = compiler.options.mode === 'development' || compiler.options.watch || !!compiler.watchMode;
        // 兼容 webpack 4.x 和 5.x 的 RawSource
        let RawSource;
        try {
            const { webpack } = compiler;
            if (webpack && webpack.sources) {
                RawSource = webpack.sources.RawSource;
            }
            else {
                RawSource = require('webpack-sources').RawSource;
            }
        }
        catch (error) {
            RawSource = SimpleRawSource;
            console.warn('AutoI18nPlugin: Could not find webpack-sources. Using fallback RawSource implementation.');
        }
        // 编译过程中的文件处理
        compiler.hooks.compilation.tap('AutoI18nPlugin', (compilation) => {
            // 在 buildModule 阶段收集中文文本
            compilation.hooks.buildModule.tap('AutoI18nPlugin', (module) => {
                if (this.pluginDisabled)
                    return;
                if (!module.resource || module.resource.includes('node_modules'))
                    return;
                const resourcePath = module.resource;
                const ext = path_1.default.extname(resourcePath).toLowerCase();
                // 仅处理 Vue/JS/TS 文件
                if (!['.vue', '.js', '.ts'].includes(ext))
                    return;
                if (!this.matchesInclude(resourcePath))
                    return;
                if (this.processedFiles.has(resourcePath))
                    return;
                this.processSourceFile(resourcePath);
                this.processedFiles.add(resourcePath);
            });
            // 在模块处理完成后，进行翻译、转换、扫描
            compilation.hooks.finishModules.tap('AutoI18nPlugin', async () => {
                try {
                    if (this.pluginDisabled)
                        return;
                    // 1. 处理收集到的文本，生成翻译
                    const newCount = await this.processCollectedTexts();
                    // 2. 转换源文件中的中文为 i18n 调用
                    await this.transformAllSourceFiles();
                    // 3. 扫描遗漏的中文键
                    const missingCount = await this.rescanForMissingKeys();
                    // 4. 检查是否可以停止处理
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
        // 编译完成时的清理和汇总
        compiler.hooks.done.tap('AutoI18nPlugin', () => {
            this.compilationCount++;
            this.processedFiles.clear(); // 为下一轮编译重新收集
            this.translationsProcessed = false; // 允许增量新增翻译
            // 保存提取报告
            this.saveExtractionReport();
            this.outputSummary();
        });
    }
    // ============ 核心处理流程 ============
    /**
     * 转换所有源文件中的中文为 i18n 调用
     *
     * 流程：
     * 1. 加载已有翻译映射
     * 2. 扫描所有 .vue/.js/.ts 文件
     * 3. 对每个文件进行代码转换（如果包含中文）
     * 4. 可选：使用 Prettier 进行代码格式化
     * 5. 写入转换后的代码
     * 6. 调试模式：记录 HMR 变化日志
     */
    async transformAllSourceFiles() {
        var _a;
        if (!this.options.transformCode)
            return;
        if (this.pluginDisabled)
            return;
        // 加载最新翻译映射
        const translationsMap = this.loadTranslationsFromMemory();
        // 依赖注入
        const fs = require('fs');
        const crypto = require('crypto');
        const glob = require('glob');
        const root = process.cwd();
        // 扫描所有源文件
        let files = glob.sync('**/*.{vue,js,ts}', {
            cwd: root,
            absolute: true,
            ignore: ['**/node_modules/**']
        });
        files = files.filter(f => this.matchesInclude(f));
        if (!files.length)
            return;
        // 初始化转换器
        const { Transformer } = require('./utils/transformer');
        const transformer = new Transformer({
            functionName: '$t',
            globalFunctionName: this.options.globalFunctionName || 'i18n.t',
            quotes: ((_a = this.options.codeStyle) === null || _a === void 0 ? void 0 : _a.quotes) || 'single',
            semicolons: false
        });
        // 中文正则表达式
        const chineseRegex = /[\u4e00-\u9fff]/;
        // 检查是否应该排除该文件
        const excludePatterns = this.options.exclude || [];
        const normalizePath = (fp) => fp.replace(/\\/g, '/');
        const shouldExclude = (filepath) => {
            if (!excludePatterns.length)
                return false;
            const normalized = normalizePath(filepath);
            for (const p of excludePatterns) {
                if (typeof p === 'string') {
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
        // 处理每个文件
        for (const file of files) {
            try {
                const ext = path_1.default.extname(file).toLowerCase();
                const source = fs.readFileSync(file, 'utf-8');
                const beforeHash = crypto.createHash('sha1').update(source).digest('hex');
                const base = path_1.default.basename(file);
                // 跳过配置文件
                if (['vue.config.js', 'webpack.config.js', 'jest.config.js', 'tsconfig.json'].includes(base))
                    continue;
                // 检查是否被排除
                if (shouldExclude(file)) {
                    if (this.options.debugExtraction) {
                        this.log('minimal', 'exclude', `skip file by exclude: ${file}`);
                    }
                    continue;
                }
                // 快速检查：是否包含中文或已有 i18n 调用
                if (!chineseRegex.test(source) && !/\b\$t\(|i18n\.t\(/.test(source))
                    continue;
                // 执行代码转换
                const transformed = transformer.transform(source, translationsMap);
                if (transformed !== source) {
                    let finalCode = transformed;
                    // 可选：使用 Prettier 格式化
                    if (this.options.formatWithPrettier) {
                        try {
                            const prettier = require('prettier');
                            const formatOptions = {
                                semi: false,
                                singleQuote: true,
                                parser: ext === '.vue' ? 'vue' : ext === '.ts' ? 'typescript' : 'babel'
                            };
                            const maybePromise = prettier.format(finalCode, formatOptions);
                            finalCode = typeof (maybePromise === null || maybePromise === void 0 ? void 0 : maybePromise.then) === 'function' ? await maybePromise : maybePromise;
                        }
                        catch (e) {
                            this.log('minimal', 'format', `Prettier 格式化失败(${base}): ${e.message}`);
                            finalCode = transformed;
                        }
                    }
                    if (typeof finalCode !== 'string') {
                        finalCode = String(finalCode);
                    }
                    // 避免开发模式下反复写入触发循环热更新
                    if (finalCode !== source) {
                        // 调试模式：记录 HMR 变化
                        if (this.options.debugHMR) {
                            const afterHash = crypto.createHash('sha1').update(finalCode).digest('hex');
                            const onlyWhitespace = source.replace(/[ \t]+/g, '').replace(/\r?\n/g, '\n') ===
                                finalCode.replace(/[ \t]+/g, '').replace(/\r?\n/g, '\n');
                            const logLine = `[HMR] rewrite ${file} before=${beforeHash} after=${afterHash} whitespaceOnly=${onlyWhitespace}`;
                            this.log('minimal', 'hmr', logLine);
                            try {
                                fs.appendFileSync(path_1.default.join(root, 'auto-i18n-hmr-debug.log'), logLine + '\n');
                            }
                            catch (_b) { }
                        }
                        // 写入转换后的代码
                        fs.writeFileSync(file, finalCode, 'utf-8');
                    }
                    else if (this.options.debugHMR) {
                        const skipHash = crypto.createHash('sha1').update(source).digest('hex');
                        const logLine = `[HMR] skip-write identical ${file} hash=${skipHash}`;
                        this.log('minimal', 'hmr', logLine);
                        try {
                            fs.appendFileSync(path_1.default.join(root, 'auto-i18n-hmr-debug.log'), logLine + '\n');
                        }
                        catch (_c) { }
                    }
                }
                else if (this.options.debugHMR) {
                    const unchangedHash = crypto.createHash('sha1').update(source).digest('hex');
                    const logLine = `[HMR] no-transform ${file} hash=${unchangedHash}`;
                    this.log('minimal', 'hmr', logLine);
                    try {
                        fs.appendFileSync(path_1.default.join(root, 'auto-i18n-hmr-debug.log'), logLine + '\n');
                    }
                    catch (_d) { }
                }
            }
            catch (e) {
                console.warn('[auto-i18n] transform file failed', file, e.message);
            }
        }
    }
    /**
     * 扫描遗漏的中文键
     * 重新扫描所有文件，寻找不在翻译文件中的中文文本
     * @returns 新发现的中文文本数量
     */
    async rescanForMissingKeys() {
        if (this.pluginDisabled)
            return 0;
        const fs = require('fs');
        const glob = require('glob');
        const root = process.cwd();
        // 扫描所有源文件
        let files = glob.sync('**/*.{vue,js,ts}', {
            cwd: root,
            absolute: true,
            ignore: ['**/node_modules/**']
        });
        files = files.filter(f => this.matchesInclude(f));
        if (!files.length)
            return 0;
        // 加载现有翻译
        await this.localeFileManager.loadTranslations();
        const existingSet = new Set();
        const existingTranslations = this.localeFileManager.getTranslations();
        for (const tr of existingTranslations)
            existingSet.add(tr.source);
        // 扫描遗漏的中文
        const newlyFound = [];
        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                const chineseTexts = content.includes('<template>') && content.includes('</template>')
                    ? this.chineseExtractor.extractFromVueFile(content)
                    : this.chineseExtractor.extractFromJsFile(content);
                // 识别新发现的中文
                for (const txt of chineseTexts) {
                    if (!existingSet.has(txt)) {
                        newlyFound.push(txt);
                        existingSet.add(txt);
                    }
                }
            }
            catch (_a) { }
        }
        // 如果没有新发现，直接返回
        if (!newlyFound.length)
            return 0;
        // 翻译新发现的中文
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
    /**
     * 处理单个源文件：提取中文文本
     *
     * 步骤：
     * 1. 读取源文件
     * 2. 根据文件类型调用相应的提取方法
     * 3. 将提取的中文加入处理集合
     * 4. 更新统计指标
     *
     * @param filePath 文件路径
     */
    async processSourceFile(filePath) {
        try {
            const fs = require('fs');
            // 处理可能包含 loader query 的资源路径（如 Component.vue?vue&type=script）
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
            // 添加到待处理集合
            chineseTexts.forEach((text) => this.processedTexts.add(text));
            // 更新统计
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
    /**
     * 处理收集到的中文文本
     *
     * 流程：
     * 1. 加载现有翻译
     * 2. 识别新增中文文本
     * 3. 调用翻译 API 生成翻译
     * 4. 保存翻译到本地文件
     *
     * @returns 新增翻译的数量
     */
    async processCollectedTexts() {
        if (this.translationsProcessed)
            return 0;
        if (this.processedTexts.size === 0)
            return 0;
        // 加载现有翻译
        await this.localeFileManager.loadTranslations();
        const allTexts = Array.from(this.processedTexts);
        // 识别新增中文
        const newTexts = allTexts.filter(text => !this.localeFileManager.hasTranslation(text));
        let newlyTranslated = [];
        // 翻译新增中文
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
        // 收集要保存的翻译（包括新增和已存在的）
        const existingUsed = this.localeFileManager.getTranslations(allTexts.filter(t => !newTexts.includes(t)));
        const toSave = [...existingUsed, ...newlyTranslated];
        // 保存翻译文件
        if (toSave.length > 0) {
            this.localeFileManager.saveTranslations(toSave);
            const totalKeys = this.localeFileManager.getTotalKeyCount();
            const processedCount = toSave.length;
            this.log('minimal', 'translate', `saved locales: keys(total)=${totalKeys} processed=${processedCount} new=${newlyTranslated.length}`);
        }
        this.translationsProcessed = true;
        const newKeyCount = this.metrics.newKeys;
        this.processedTexts.clear();
        return newKeyCount;
    }
    /**
     * 输出编译汇总信息
     */
    outputSummary() {
        var _a, _b, _c;
        const totalKeys = (_c = (_b = (_a = this.localeFileManager).getTotalKeyCount) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : 0;
        this.log('minimal', 'summary', `Vue files scanned=${this.metrics.scannedVue} updated=${this.metrics.updatedVue} skipped=${this.metrics.skippedVue} chinese=${this.metrics.chineseVue} newKeys=${this.metrics.newKeys} totalKeys=${totalKeys}`);
    }
    /**
     * 从内存加载已有的翻译映射
     * 从输出目录读取所有 JSON 语言文件，构建中英文映射
     * @returns 翻译映射对象 { source: { locale: translation } }
     */
    /**
     * 从内存加载已有的翻译映射
     * 从输出目录读取所有 JSON 语言文件，构建中英文映射
     * @returns 翻译映射对象 { source: { locale: translation } }
     */
    loadTranslationsFromMemory() {
        const translations = {};
        try {
            const fs = require('fs');
            const localesDir = path_1.default.resolve(this.options.outputPath);
            if (!fs.existsSync(localesDir)) {
                return translations;
            }
            // 读取所有 JSON 语言文件
            const files = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json'));
            for (const file of files) {
                const locale = path_1.default.basename(file, '.json');
                const filePath = path_1.default.join(localesDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const localeTranslations = JSON.parse(content);
                    // 合并到翻译映射
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
    /**
     * 保存提取报告为 HTML 文件
     */
    saveExtractionReport() {
        try {
            if (this.compilationCount !== 1)
                return; // 只在第一次编译后生成报告
            const reporter = this.chineseExtractor.getReporter();
            const report = reporter.getReport();
            // 仅当有提取内容时才生成报告
            if (report.totalCount === 0)
                return;
            const reportPath = reporter.saveReport(this.options.outputPath || './src/locales');
            this.log('minimal', 'report', `✅ 提取报告已生成: ${reportPath}`);
        }
        catch (error) {
            this.log('minimal', 'report', `⚠️ 生成提取报告失败: ${error.message}`);
        }
    }
}
// ============ 模块导出 ============
// CommonJS 格式导出，webpack 插件需要此格式
module.exports = AutoI18nPlugin;

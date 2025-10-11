"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const chinese_extractor_1 = require("./utils/chinese-extractor");
const translation_service_1 = require("./utils/translation-service");
const locale_file_manager_1 = require("./utils/locale-file-manager");
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
        this.processedTexts = new Set();
        this.isDevMode = false;
        this.compilationCount = 0;
        this.options = Object.assign({ outputPath: './src/locales', presets: {}, exclude: [], ignoreComments: true, apiKey: '', apiProvider: 'preset', sourceLanguage: 'zh', targetLanguages: ['en', 'zh-TW'] }, options);
        this.translationService = new translation_service_1.TranslationService({
            apiKey: this.options.apiKey,
            apiProvider: this.options.apiProvider,
            sourceLanguage: this.options.sourceLanguage,
            targetLanguages: this.options.targetLanguages,
            presets: this.options.presets || {}
        });
        this.localeFileManager = new locale_file_manager_1.LocaleFileManager(this.options.outputPath || './src/locales', this.options.targetLanguages || ['en', 'zh-TW']);
        this.chineseExtractor = new chinese_extractor_1.ChineseExtractor({
            ignoreComments: this.options.ignoreComments
        });
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
            // 调试输出
            console.log('AutoI18nPlugin: transformCode =', this.options.transformCode);
            console.log('AutoI18nPlugin: memoryTransformOnly =', this.options.memoryTransformOnly);
            // 内存转换现在通过chainWebpack处理，不在插件内部处理
            // if (this.options.transformCode && this.options.memoryTransformOnly) {
            //   this.addTransformLoader(compiler)
            // }
            // 使用 buildModule 钩子处理每个模块
            compilation.hooks.buildModule.tap('AutoI18nPlugin', (module) => {
                // 只处理用户源文件，忽略 node_modules
                if (module.resource && !module.resource.includes('node_modules')) {
                    const resourcePath = module.resource;
                    const ext = path_1.default.extname(resourcePath).toLowerCase();
                    // 只处理 .vue 和 .js/.ts 文件
                    if (ext === '.vue' || ext === '.js' || ext === '.ts') {
                        this.processSourceFile(resourcePath);
                    }
                }
            });
            // 在所有模块处理完成后进行翻译和保存
            compilation.hooks.finishModules.tapAsync('AutoI18nPlugin', async (modules, callback) => {
                await this.processCollectedTexts();
                callback();
            });
        });
        // 在开发模式下，当编译完成时可以选择性保存翻译文件
        if (this.isDevMode) {
            compiler.hooks.done.tap('AutoI18nPlugin', () => {
                // 只在第一次编译完成时处理，避免循环
                if (this.compilationCount === 1 && this.processedTexts.size > 0) {
                    console.log(`AutoI18nPlugin: Dev mode - cached ${this.processedTexts.size} translations for potential save`);
                }
            });
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
        if (this.processedTexts.size === 0) {
            console.log('AutoI18nPlugin: No Chinese texts found in source files');
            return;
        }
        console.log('AutoI18nPlugin: Processing source files...');
        // 读取现有的翻译文件
        await this.localeFileManager.loadTranslations();
        // 翻译新的中文文本 - 过滤掉已处理的文本避免重复处理
        const allTexts = Array.from(this.processedTexts);
        const newTexts = allTexts.filter(text => !this.localeFileManager.hasTranslation(text));
        if (newTexts.length > 0) {
            console.log(`AutoI18nPlugin: Found ${newTexts.length} new Chinese texts to translate`);
            try {
                const translations = await this.translationService.translateBatch(newTexts);
                // 更新翻译文件
                this.localeFileManager.addTranslations(translations);
                // 在开发模式下，只保存第一次编译的结果，避免无限循环
                this.compilationCount++;
                if (!this.isDevMode || this.compilationCount === 1) {
                    // 将翻译保存到文件
                    const allTranslationsArray = [];
                    for (const text of allTexts) {
                        const translationRecord = await this.translationService.translateBatch([text]);
                        if (translationRecord.length > 0) {
                            allTranslationsArray.push(translationRecord[0]);
                        }
                    }
                    this.localeFileManager.saveTranslations(allTranslationsArray);
                    console.log(`AutoI18nPlugin: Translations saved to ${this.options.outputPath}`);
                }
                else {
                    console.log('AutoI18nPlugin: Dev mode - translations cached but not saved to avoid rebuild loop');
                }
            }
            catch (error) {
                console.error('AutoI18nPlugin: Translation error', error);
            }
        }
        else {
            console.log('AutoI18nPlugin: No new Chinese texts found in source files');
        }
    }
    addTransformLoader(compiler) {
        console.log('AutoI18nPlugin: Adding memory transform loader (simplified)');
        // 使用 webpack 的 normalModuleFactory 钩子直接处理模块
        compiler.hooks.normalModuleFactory.tap('AutoI18nPlugin', (factory) => {
            factory.hooks.afterResolve.tap('AutoI18nPlugin', (resolveData) => {
                const resource = resolveData.resource;
                // 只处理我们关心的文件
                if (resource && this.shouldTransformFile(resource)) {
                    console.log('AutoI18nPlugin: Intercepting resource:', path_1.default.basename(resource));
                    // 添加我们的 loader 到 loaders 链的最后
                    if (!resolveData.loaders) {
                        resolveData.loaders = [];
                    }
                    resolveData.loaders.push({
                        loader: path_1.default.join(__dirname, 'auto-i18n-loader.js'),
                        options: {
                            memoryTransformOnly: true,
                            functionName: '$t',
                            outputPath: this.options.outputPath
                        }
                    });
                }
            });
        });
        console.log('AutoI18nPlugin: Memory transform loader registered');
    }
    shouldTransformFile(resource) {
        if (!resource)
            return false;
        if (resource.includes('node_modules'))
            return false;
        const ext = path_1.default.extname(resource).toLowerCase();
        return ['.vue', '.js', '.ts'].includes(ext);
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

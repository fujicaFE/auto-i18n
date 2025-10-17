"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocaleFileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class LocaleFileManager {
    constructor(outputPath, locales = ['en', 'zh-TW'], sourceLanguage = 'zh') {
        this.translations = new Map();
        this.outputPath = outputPath;
        this.locales = locales;
        this.sourceLanguage = sourceLanguage;
    }
    /**
     * 检查是否有翻译
     */
    hasTranslation(text) {
        return this.translations.has(text);
    }
    /**
     * 加载翻译
     */
    async loadTranslations() {
        const existingTranslations = this.loadExistingTranslations();
        for (const [source, translations] of Object.entries(existingTranslations)) {
            this.translations.set(source, translations);
        }
    }
    /**
     * 添加翻译
     */
    addTranslations(newTranslations) {
        for (const translation of newTranslations) {
            this.translations.set(translation.source, translation.translations);
        }
    }
    /**
     * 按源文本列表获取翻译记录（若 sources 未传则返回全部）
     */
    getTranslations(sources) {
        const result = [];
        if (sources) {
            for (const src of sources) {
                const record = this.translations.get(src);
                if (record) {
                    result.push({ source: src, translations: record });
                }
            }
        }
        else {
            for (const [src, record] of this.translations.entries()) {
                result.push({ source: src, translations: record });
            }
        }
        return result;
    }
    /**
     * 确保输出目录存在
     */
    ensureOutputPath() {
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }
    }
    /**
     * 加载现有的翻译文件
     */
    loadExistingTranslations() {
        const translations = {};
        // 确保输出目录存在
        this.ensureOutputPath();
        // 遍历所有语言
        for (const locale of this.locales) {
            const filePath = path.join(this.outputPath, `${locale}.json`);
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);
                    // 遍历所有翻译条目
                    for (const [key, value] of Object.entries(data)) {
                        if (!translations[key]) {
                            translations[key] = {};
                        }
                        translations[key][locale] = value;
                    }
                }
                catch (error) {
                    console.error(`加载翻译文件失败 ${filePath}:`, error);
                }
            }
        }
        return translations;
    }
    /**
     * 保存翻译到文件
     */
    saveTranslations(translations) {
        var _a, _b;
        this.ensureOutputPath();
        // 读取现有文件
        const existingByLocale = {};
        for (const locale of this.locales) {
            const filePath = path.join(this.outputPath, `${locale}.json`);
            if (fs.existsSync(filePath)) {
                try {
                    existingByLocale[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                }
                catch (_c) {
                    existingByLocale[locale] = {};
                }
            }
            else {
                existingByLocale[locale] = {};
            }
        }
        // 合并：保留现有键顺序，追加新键
        for (const translation of translations) {
            const { source, translations: translatedTexts } = translation;
            for (const locale of this.locales) {
                const target = existingByLocale[locale];
                const candidate = translatedTexts[locale];
                if (candidate !== undefined) {
                    target[source] = locale === this.sourceLanguage ? source : candidate;
                }
                else if (locale === this.sourceLanguage && !target[source]) {
                    target[source] = source; // 确保源语言有条目
                }
            }
        }
        for (const locale of this.locales) {
            const filePath = path.join(this.outputPath, `${locale}.json`);
            try {
                const newContent = JSON.stringify(existingByLocale[locale], null, 2);
                let shouldWrite = true;
                if (fs.existsSync(filePath)) {
                    try {
                        const oldContent = fs.readFileSync(filePath, 'utf8');
                        if (oldContent === newContent) {
                            shouldWrite = false; // 无变更，避免触发不必要的 HMR
                        }
                    }
                    catch (_d) { }
                }
                if (shouldWrite) {
                    fs.writeFileSync(filePath, newContent, 'utf8');
                    console.log(`成功保存翻译文件: ${filePath}`);
                    if ((_a = this.pluginOptions) === null || _a === void 0 ? void 0 : _a.debugHMR) {
                        const hash = require('crypto').createHash('sha1').update(newContent).digest('hex');
                        console.log(`[auto-i18n:hmr] locale write ${filePath} hash=${hash}`);
                    }
                }
                else {
                    if ((_b = this.pluginOptions) === null || _b === void 0 ? void 0 : _b.debugHMR) {
                        const hash = require('crypto').createHash('sha1').update(newContent).digest('hex');
                        console.log(`[auto-i18n:hmr] locale skip (no change) ${filePath} hash=${hash}`);
                    }
                }
            }
            catch (e) {
                console.error(`保存翻译文件失败 ${filePath}:`, e);
            }
        }
    }
    /**
     * 合并新的翻译与现有的翻译
     */
    mergeTranslations(existingTranslations, newTranslations) {
        const merged = [];
        // 处理所有新的翻译
        for (const newTranslation of newTranslations) {
            const { source, translations } = newTranslation;
            // 检查是否存在现有翻译
            if (existingTranslations[source]) {
                // 合并现有翻译和新翻译
                const mergedTranslations = Object.assign(Object.assign({}, translations), existingTranslations[source]);
                merged.push({
                    source,
                    translations: mergedTranslations
                });
            }
            else {
                // 直接添加新翻译
                merged.push(newTranslation);
            }
        }
        // 处理所有现有翻译（确保不会丢失）
        for (const [source, translations] of Object.entries(existingTranslations)) {
            // 检查是否已经处理过
            const alreadyProcessed = merged.some(item => item.source === source);
            if (!alreadyProcessed) {
                merged.push({
                    source,
                    translations
                });
            }
        }
        return merged;
    }
    /**
     * 获取当前内存中已加载（或合并后）的全部源文本 key 总数
     */
    getTotalKeyCount() {
        return this.translations.size;
    }
}
exports.LocaleFileManager = LocaleFileManager;

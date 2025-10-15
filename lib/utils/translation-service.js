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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto-js"));
const chineseConv = __importStar(require("chinese-conv"));
class TranslationService {
    constructor(options) {
        this.cache = new Map();
        this.options = Object.assign({ apiKey: '', apiProvider: 'preset', sourceLanguage: 'zh', targetLanguages: ['en', 'zh-TW'], presets: {} }, options);
        // 预加载预设翻译
        if (this.options.presets) {
            for (const [source, translations] of Object.entries(this.options.presets)) {
                this.cache.set(source, Object.assign({}, translations));
            }
        }
    }
    async translateBatch(texts) {
        // 过滤掉已有缓存的文本
        const textsToTranslate = texts.filter(text => !this.cache.has(text));
        if (textsToTranslate.length === 0) {
            // 所有文本都已经在缓存中
            return texts.map(text => ({
                source: text,
                translations: this.cache.get(text) || {}
            }));
        }
        // 创建翻译结果数组
        const translations = [];
        // 根据API提供商进行不同的处理
        switch (this.options.apiProvider) {
            case 'preset':
            case 'none':
                // 使用内部预设翻译或不使用API，只处理繁体中文
                for (const text of textsToTranslate) {
                    const result = {};
                    // 对于繁体中文，使用chinese-conv库直接转换
                    const targetLanguages = this.options.targetLanguages || ['en', 'zh-TW'];
                    // 为每种目标语言生成翻译
                    for (const lang of targetLanguages) {
                        if (lang === this.options.sourceLanguage) {
                            // 源语言使用原文
                            result[lang] = text;
                        }
                        else if (lang === 'zh-TW') {
                            // 繁体中文使用转换
                            result[lang] = chineseConv.tify(text);
                        }
                        else {
                            // 其他语言使用占位符
                            result[lang] = `[${lang}] ${text}`;
                        }
                    }
                    // 添加到缓存
                    this.cache.set(text, result);
                    translations.push({
                        source: text,
                        translations: result
                    });
                }
                break;
            case 'baidu':
                // 百度翻译API
                for (const text of textsToTranslate) {
                    const result = {};
                    const targetLanguages = this.options.targetLanguages || ['en', 'zh-TW'];
                    for (const targetLang of targetLanguages) {
                        if (targetLang === this.options.sourceLanguage) {
                            // 源语言使用原文
                            result[targetLang] = text;
                        }
                        else if (targetLang === 'zh-TW') {
                            // 繁体中文可以直接转换
                            result[targetLang] = chineseConv.tify(text);
                            continue;
                        }
                        else {
                            try {
                                const translated = await this.translateWithBaidu(text, targetLang);
                                result[targetLang] = translated;
                            }
                            catch (error) {
                                console.error(`翻译错误 (${text} -> ${targetLang}):`, error);
                                result[targetLang] = `[${targetLang}] ${text}`;
                            }
                        }
                    }
                    // 添加到缓存
                    this.cache.set(text, result);
                    translations.push({
                        source: text,
                        translations: result
                    });
                }
                break;
            // 可以添加其他翻译API的支持
            default:
                console.warn(`不支持的翻译提供商: ${this.options.apiProvider}，使用内部预设翻译`);
                // 回退到使用内部预设翻译的处理方式
                for (const text of textsToTranslate) {
                    const result = {};
                    const targetLangs = this.options.targetLanguages || ['en', 'zh-TW'];
                    for (const lang of targetLangs) {
                        if (lang === this.options.sourceLanguage) {
                            // 源语言使用原文
                            result[lang] = text;
                        }
                        else if (lang === 'zh-TW') {
                            // 繁体中文使用转换
                            result[lang] = chineseConv.tify(text);
                        }
                        else {
                            // 其他语言使用占位符
                            result[lang] = `[${lang}] ${text}`;
                        }
                    }
                    this.cache.set(text, result);
                    translations.push({
                        source: text,
                        translations: result
                    });
                }
        }
        // 合并缓存中已有的翻译
        for (const text of texts) {
            if (!textsToTranslate.includes(text)) {
                translations.push({
                    source: text,
                    translations: this.cache.get(text) || {}
                });
            }
        }
        return translations;
    }
    async translateWithBaidu(text, targetLang) {
        if (!this.options.apiKey) {
            throw new Error('百度翻译API需要apiKey');
        }
        // 百度API需要appid和密钥
        const [appid, key] = this.options.apiKey.split(':');
        if (!appid || !key) {
            throw new Error('百度翻译API的apiKey格式应为 "appid:密钥"');
        }
        // 处理语言代码
        const from = 'zh';
        let to = targetLang;
        // 百度翻译API的语言代码映射
        const langMap = {
            'en': 'en',
            'zh-TW': 'cht'
        };
        if (langMap[targetLang]) {
            to = langMap[targetLang];
        }
        // 生成随机数
        const salt = Date.now();
        // 计算签名: appid + text + salt + key
        const sign = crypto.MD5(appid + text + salt + key).toString();
        // 发送请求
        const response = await (0, axios_1.default)({
            method: 'post',
            url: 'http://api.fanyi.baidu.com/api/trans/vip/translate',
            params: {
                q: text,
                from,
                to,
                appid,
                salt,
                sign
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        if (response.data.error_code) {
            throw new Error(`百度翻译API错误: ${response.data.error_code} ${response.data.error_msg}`);
        }
        if (!response.data.trans_result || response.data.trans_result.length === 0) {
            throw new Error('百度翻译API返回结果为空');
        }
        return response.data.trans_result[0].dst;
    }
}
exports.TranslationService = TranslationService;

import axios from 'axios';
import * as crypto from 'crypto-js';
import * as chineseConv from 'chinese-conv';
import { TranslationServiceOptions, Translation } from '../types';

export class TranslationService {
  private options: TranslationServiceOptions;
  private cache: Map<string, Record<string, string>> = new Map();

  constructor(options: TranslationServiceOptions) {
    this.options = {
      apiKey: '',
      apiProvider: 'preset',
      sourceLanguage: 'zh',
      targetLanguages: ['en', 'zh-TW'],
      presets: {},
      ...options
    };

    // 预加载预设翻译
    if (this.options.presets) {
      for (const [source, translations] of Object.entries(this.options.presets)) {
        this.cache.set(source, { ...translations });
      }
    }
  }

  async translateBatch(texts: string[]): Promise<Translation[]> {
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
    const translations: Translation[] = [];

    // 根据API提供商进行不同的处理
    switch(this.options.apiProvider) {
      case 'preset':
      case 'none':
        // 使用内部预设翻译或不使用API，只处理繁体中文
        for (const text of textsToTranslate) {
          const result: Record<string, string> = {};

          // 对于繁体中文，使用chinese-conv库直接转换
          const targetLanguages = this.options.targetLanguages || ['en', 'zh-TW'];

          // 为每种目标语言生成翻译
          for (const lang of targetLanguages) {
            if (lang === this.options.sourceLanguage) {
              // 源语言使用原文
              result[lang] = text;
            } else if (lang === 'zh-TW') {
              // 繁体中文使用转换
              result[lang] = chineseConv.tify(text);
            } else {
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
          const result: Record<string, string> = {};

          const targetLanguages = this.options.targetLanguages || ['en', 'zh-TW'];

          for (const targetLang of targetLanguages) {
            if (targetLang === this.options.sourceLanguage) {
              // 源语言使用原文
              result[targetLang] = text;
            } else if (targetLang === 'zh-TW') {
              // 繁体中文可以直接转换
              result[targetLang] = chineseConv.tify(text);
              continue;
            } else {
              try {
                const translated = await this.translateWithBaidu(text, targetLang);
                result[targetLang] = translated;
              } catch (error) {
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
          const result: Record<string, string> = {};

          const targetLangs = this.options.targetLanguages || ['en', 'zh-TW'];

          for (const lang of targetLangs) {
            if (lang === this.options.sourceLanguage) {
              // 源语言使用原文
              result[lang] = text;
            } else if (lang === 'zh-TW') {
              // 繁体中文使用转换
              result[lang] = chineseConv.tify(text);
            } else {
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

  private async translateWithBaidu(text: string, targetLang: string): Promise<string> {
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
    const langMap: Record<string, string> = {
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
    const response = await axios({
      method: 'post',
      url: 'https://api.fanyi.baidu.com/api/trans/vip/translate',
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

  // 可以根据需要添加其他翻译API的实现
  // private translateWithGoogle()
  // private translateWithDeepL()
  // private translateWithYoudao()
}

import * as fs from 'fs';
import * as path from 'path';
import { Translation } from '../types';

export class LocaleFileManager {
  private outputPath: string;
  private locales: string[];
  private sourceLanguage: string;
  private translations: Map<string, Record<string, string>> = new Map();

  constructor(outputPath: string, locales: string[] = ['en', 'zh-TW'], sourceLanguage: string = 'zh') {
    this.outputPath = outputPath;
    this.locales = locales;
    this.sourceLanguage = sourceLanguage;
  }

  /**
   * 检查是否有翻译
   */
  hasTranslation(text: string): boolean {
    return this.translations.has(text);
  }

  /**
   * 加载翻译
   */
  async loadTranslations(): Promise<void> {
    const existingTranslations = this.loadExistingTranslations();
    for (const [source, translations] of Object.entries(existingTranslations)) {
      this.translations.set(source, translations);
    }
  }

  /**
   * 添加翻译
   */
  addTranslations(newTranslations: Translation[]): void {
    for (const translation of newTranslations) {
      this.translations.set(translation.source, translation.translations);
    }
  }

  /**
   * 按源文本列表获取翻译记录（若 sources 未传则返回全部）
   */
  getTranslations(sources?: string[]): Translation[] {
    const result: Translation[] = [];
    if (sources) {
      for (const src of sources) {
        const record = this.translations.get(src);
        if (record) {
          result.push({ source: src, translations: record });
        }
      }
    } else {
      for (const [src, record] of this.translations.entries()) {
        result.push({ source: src, translations: record });
      }
    }
    return result;
  }

  /**
   * 确保输出目录存在
   */
  ensureOutputPath(): void {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
  }

  /**
   * 加载现有的翻译文件
   */
  loadExistingTranslations(): Record<string, Record<string, string>> {
    const translations: Record<string, Record<string, string>> = {};

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

            translations[key][locale] = value as string;
          }
        } catch (error) {
          console.error(`加载翻译文件失败 ${filePath}:`, error);
        }
      }
    }

    return translations;
  }

  /**
   * 保存翻译到文件
   */
  saveTranslations(translations: Translation[]): void {
    this.ensureOutputPath();
    // 读取现有文件
    const existingByLocale: Record<string, Record<string, string>> = {};
    for (const locale of this.locales) {
      const filePath = path.join(this.outputPath, `${locale}.json`);
      if (fs.existsSync(filePath)) {
        try {
          existingByLocale[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {
          existingByLocale[locale] = {};
        }
      } else {
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
        } else if (locale === this.sourceLanguage && !target[source]) {
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
          } catch {}
        }
        if (shouldWrite) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`成功保存翻译文件: ${filePath}`);
          if ((this as any).pluginOptions?.debugHMR) {
            const hash = require('crypto').createHash('sha1').update(newContent).digest('hex')
            console.log(`[auto-i18n:hmr] locale write ${filePath} hash=${hash}`)
          }
        } else {
          if ((this as any).pluginOptions?.debugHMR) {
            const hash = require('crypto').createHash('sha1').update(newContent).digest('hex')
            console.log(`[auto-i18n:hmr] locale skip (no change) ${filePath} hash=${hash}`)
          }
        }
      } catch (e) {
        console.error(`保存翻译文件失败 ${filePath}:`, e);
      }
    }
  }

  /**
   * 合并新的翻译与现有的翻译
   */
  mergeTranslations(
    existingTranslations: Record<string, Record<string, string>>,
    newTranslations: Translation[]
  ): Translation[] {
    const merged: Translation[] = [];

    // 处理所有新的翻译
    for (const newTranslation of newTranslations) {
      const { source, translations } = newTranslation;

      // 检查是否存在现有翻译
      if (existingTranslations[source]) {
        // 合并现有翻译和新翻译
        const mergedTranslations = {
          ...translations,
          ...existingTranslations[source]
        };

        merged.push({
          source,
          translations: mergedTranslations
        });
      } else {
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
  getTotalKeyCount(): number {
    return this.translations.size;
  }

  /**
   * 获取转换用的翻译映射格式
   * 将内存中缓存的翻译转换为 { source: { locale: translation } } 格式
   * @returns 翻译映射对象
   */
  getTranslationMap(): { [key: string]: { [locale: string]: string } } {
    const translationsMap: { [key: string]: { [locale: string]: string } } = {}
    for (const [source, record] of this.translations.entries()) {
      translationsMap[source] = record
    }
    return translationsMap
  }
}

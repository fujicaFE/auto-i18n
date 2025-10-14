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
    // 确保输出目录存在
    this.ensureOutputPath();

    // 按语言组织翻译
    const localeData: Record<string, Record<string, string>> = {};

    // 初始化语言数据结构
    for (const locale of this.locales) {
      localeData[locale] = {};
    }

    // 将翻译数据按语言组织
    for (const translation of translations) {
      const { source, translations: translatedTexts } = translation;

      // 将每个语言的翻译添加到相应的数据结构中
      for (const [locale, text] of Object.entries(translatedTexts)) {
        if (this.locales.includes(locale)) {
          // 如果是源语言，使用原文
          if (locale === this.sourceLanguage) {
            localeData[locale][source] = source;
          } else {
            localeData[locale][source] = text;
          }
        }
      }
    }

    // 保存每种语言的翻译到对应的文件
    for (const locale of this.locales) {
      const filePath = path.join(this.outputPath, `${locale}.json`);
      const content = JSON.stringify(localeData[locale], null, 2);

      try {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`成功保存翻译文件: ${filePath}`);
      } catch (error) {
        console.error(`保存翻译文件失败 ${filePath}:`, error);
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
}

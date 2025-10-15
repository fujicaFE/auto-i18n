import { Translation } from '../types';
export declare class LocaleFileManager {
    private outputPath;
    private locales;
    private sourceLanguage;
    private translations;
    constructor(outputPath: string, locales?: string[], sourceLanguage?: string);
    /**
     * 检查是否有翻译
     */
    hasTranslation(text: string): boolean;
    /**
     * 加载翻译
     */
    loadTranslations(): Promise<void>;
    /**
     * 添加翻译
     */
    addTranslations(newTranslations: Translation[]): void;
    /**
     * 按源文本列表获取翻译记录（若 sources 未传则返回全部）
     */
    getTranslations(sources?: string[]): Translation[];
    /**
     * 确保输出目录存在
     */
    ensureOutputPath(): void;
    /**
     * 加载现有的翻译文件
     */
    loadExistingTranslations(): Record<string, Record<string, string>>;
    /**
     * 保存翻译到文件
     */
    saveTranslations(translations: Translation[]): void;
    /**
     * 合并新的翻译与现有的翻译
     */
    mergeTranslations(existingTranslations: Record<string, Record<string, string>>, newTranslations: Translation[]): Translation[];
    /**
     * 获取当前内存中已加载（或合并后）的全部源文本 key 总数
     */
    getTotalKeyCount(): number;
}

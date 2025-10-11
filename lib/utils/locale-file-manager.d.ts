import { Translation } from '../types';
export declare class LocaleFileManager {
    private outputPath;
    private locales;
    private translations;
    constructor(outputPath: string, locales?: string[]);
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
}

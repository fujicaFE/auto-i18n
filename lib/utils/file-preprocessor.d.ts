/**
 * 文件预处理器
 * 负责Vue文件的直接预处理，直接修改源文件
 */
import { ChineseExtractor } from './chinese-extractor';
export interface TranslationData {
    [key: string]: {
        [locale: string]: string;
    };
}
export declare class FilePreprocessor {
    private chineseExtractor;
    constructor(chineseExtractor: ChineseExtractor);
    /**
     * 直接处理Vue文件，修改源文件
     */
    processVueFilesDirectly(outputPath: string): Promise<void>;
    /**
     * 转换Vue文件内容，将中文文本替换为$t()调用
     * 使用专业的Transformer来处理JavaScript和模板部分
     */
    transformVueFileContent(content: string, translations: TranslationData): string;
    /**
     * 处理render函数
     */
    processRenderFunction(source: string, resourcePath: string, translations: any): void;
    /**
     * 从文件系统加载翻译数据
     */
    private loadTranslationsFromMemory;
}

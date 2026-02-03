import { ChineseExtractorOptions } from '../types';
import { ExtractionReporter } from './extraction-reporter';
export declare class ChineseExtractor {
    private options;
    private debug;
    private reporter;
    private useReporter;
    constructor(options?: ChineseExtractorOptions);
    /**
     * 启用报告生成
     */
    enableReporting(enable?: boolean): void;
    /**
     * 获取报告
     */
    getReporter(): ExtractionReporter;
    /**
     * 从Vue文件中提取所有中文字符串
     * @param source Vue文件源代码
     */
    extractFromVueFile(source: string): string[];
    /**
     * 检查是否为有效的中文文本（排除HTML标记等）
     */
    private isValidChineseText;
    /**
     * 从Vue模板中提取中文文本
     * @param template Vue模板HTML代码
     */
    extractFromTemplate(template: string): string[];
    /**
     * 从JS文件中提取所有中文字符串
     * @param source JS文件源代码
     */
    extractFromJsFile(source: string): string[];
    /**
     * 从源代码中提取所有中文字符串
     * @param source 源代码
     * @param filePath 文件路径（可选，用于日志）
     */
    extract(source: string, filePath?: string): string[];
    /**
     * 使用正则表达式方法提取中文（回退方案）
     */
    private extractByRegex;
    /**
     * 检查节点是否在注释中
     */
    private isInComment;
    /**
     * 从文本中提取中文片段
     */
    private extractChineseSegments;
}

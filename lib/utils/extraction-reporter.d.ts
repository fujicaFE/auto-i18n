/**
 * 中文提取报告生成器
 * 负责生成 HTML 格式的中文提取分析报告
 */
export interface ExtractedItem {
    text: string;
    source: 'ast' | 'regex';
    category: string;
    filePath?: string;
}
export interface ExtractionReport {
    timestamp: string;
    totalCount: number;
    astCount: number;
    regexCount: number;
    items: ExtractedItem[];
}
export declare class ExtractionReporter {
    private items;
    /**
     * 添加提取的文本
     */
    addItem(text: string, source: 'ast' | 'regex', category: string, filePath?: string): void;
    /**
     * 生成 HTML 报告
     */
    generateReport(filePath?: string): string;
    /**
     * 渲染一个数据表格部分
     */
    private renderSection;
    /**
     * 转义 HTML 特殊字符
     */
    private escapHtml;
    /**
     * 生成报告文件路径
     */
    static getReportPath(outputPath: string): string;
    /**
     * 保存报告到文件
     */
    saveReport(outputPath: string): string;
    /**
     * 清空数据
     */
    clear(): void;
    /**
     * 获取报告数据
     */
    getReport(): ExtractionReport;
}

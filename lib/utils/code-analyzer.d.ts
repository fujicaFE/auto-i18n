/**
 * 代码分析器
 * 负责分析代码中的i18n模式和验证转换质量
 */
export interface I18nValidationResult {
    hasI18nCalls: boolean;
    i18nCallCount: number;
    patterns: {
        _s_$t: number;
        _v_$t: number;
        direct_$t: number;
        vm_$t: number;
    };
    samples: string[];
}
export interface ChineseTextAnalysis {
    count: number;
    samples: string[];
}
export interface TemplatePattern {
    pattern: RegExp;
    name: string;
}
export declare class CodeAnalyzer {
    /**
     * 分析代码中的i18n函数调用模式
     */
    analyzeI18nPatterns(source: string): void;
    /**
     * 分析Vue template编译模式
     */
    analyzeVueTemplatePatterns(source: string): void;
    /**
     * 提取匹配项周围的上下文
     */
    extractContextAroundMatch(source: string, pattern: RegExp, description: string): void;
    /**
     * 验证i18n转换是否成功
     */
    validateI18nTransformation(code: string): I18nValidationResult;
    /**
     * 检查未转换的中文字符串
     */
    checkRemainingChineseText(code: string): ChineseTextAnalysis;
    /**
     * 输出转换质量报告
     */
    outputTransformationQualityReport(filename: string, validationResult: I18nValidationResult): void;
    /**
     * 获取主要的转换模式
     */
    getMainPattern(patterns: I18nValidationResult['patterns']): string;
    /**
     * 处理render函数在emit阶段的分析
     */
    processRenderFunctionInEmit(source: string, filename: string, translations: any): void;
}

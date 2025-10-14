/**
 * Vue Render 函数检测器
 * 负责检测和分析Vue组件的render函数
 */
export interface RenderDetectionResult {
    hasRenderFunction: boolean;
    vueVersion: 'vue2' | 'vue3' | 'unknown';
    patterns: string[];
}
export declare class RenderDetector {
    /**
     * 检查AST是否包含render函数
     */
    checkForRenderFunction(ast: any): boolean;
    /**
     * 检查编译后的代码中是否包含Vue render函数的特征
     */
    checkForRenderInEmittedCode(source: string): RenderDetectionResult;
    /**
     * 简化路径显示，只显示关键部分
     */
    shortenPath(filePath: string): string;
    /**
     * 检查资源是否应该被转换
     */
    shouldTransformFile(resource: string, excludePatterns?: (string | RegExp)[]): boolean;
}

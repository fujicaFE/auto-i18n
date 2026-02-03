import { TransformerOptions } from '../types';
export declare class Transformer {
    private options;
    constructor(options?: TransformerOptions);
    /**
     * 转换源代码中的中文字符串为i18n调用
     * @param source 源代码
     * @param translations 翻译映射，source -> { locale -> text }
     */
    transform(source: string, translations: Record<string, Record<string, string>>): string;
    /**
     * 转换 Vue 单文件组件
     */
    private transformVueFile;
    /**
     * 转换 Vue 模板中的中文文本
     */
    private transformVueTemplate;
    /**
     * 转义正则表达式特殊字符
     */
    private escapeRegex;
    /**
     * 检测源代码的代码风格
     */
    private detectCodeStyle;
    /**
     * 转换 JavaScript 代码
     */
    private transformJavaScript;
    /**
     * 检查字符串是否看起来像正则表达式
     * 用于避免转换正则表达式字符串中的中文
     */
    private looksLikeRegexString;
    /**
     * 检查节点是否在Vue组件上下文中（需要使用this.$t）
     */
    private isInVueComponentContext;
    /**
     * 检查是否位于 data() 方法返回对象的上下文（此处需使用全局函数，如 window.$t）
     */
    private isInDataFunction;
    /**
     * 检查是否在 props 的 default 值中
     */
    private isInPropsDefault;
    /**
     * 检查节点是否已经在i18n函数调用中
     */
    private isInI18nCall;
    private buildCalleeFromDotted;
    private matchesGlobalFunctionChain;
}

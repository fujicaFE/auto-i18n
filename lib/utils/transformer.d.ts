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
     * 检查节点是否已经在i18n函数调用中
     */
    private isInI18nCall;
}

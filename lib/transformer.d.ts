import { BabelPluginOptions } from './types';
/**
 * 代码转换工具类 - 将中文字符串替换为i18n函数调用
 */
declare class Transformer {
    /**
     * 转换JS文件中的中文字符串为i18n函数调用
     * @param source 源代码
     * @param options 转换选项
     * @returns 转换后的代码
     */
    transformJsFileToI18n(source: string, options?: BabelPluginOptions): string;
    /**
     * 转换Vue文件中的中文字符串为i18n函数调用
     * @param source Vue文件内容
     * @param options 转换选项
     * @returns 转换后的代码
     */
    transformVueFileToI18n(source: string, options?: BabelPluginOptions): string;
    /**
     * 通用转换函数，将代码中的中文字符串替换为i18n函数调用
     * @param source 源代码
     * @param options 转换选项
     * @returns 转换后的代码
     */
    private transform;
}
export declare const transform: Transformer;
export {};

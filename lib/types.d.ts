export interface AutoI18nPluginOptions {
    /**
     * 输出语言文件的目录路径
     * @default './src/locales'
     */
    outputPath?: string;
    /**
     * 预设的翻译词汇，优先于自动翻译
     * 格式: { [中文文本]: { en: '英文翻译', 'zh-TW': '繁體中文翻譯' } }
     */
    presets?: {
        [key: string]: {
            [key: string]: string;
        };
    };
    /**
     * 要排除的文件路径模式（字符串或正则表达式）
     */
    exclude?: (string | RegExp)[];
    /**
     * 是否忽略注释中的中文
     * @default true
     */
    ignoreComments?: boolean;
    /**
     * 翻译API的密钥
     */
    apiKey?: string;
    /**
     * 翻译服务提供商
     * @default 'preset'
     */
    apiProvider?: 'preset' | 'baidu' | 'google' | 'deepl' | 'youdao' | 'none';
    /**
     * 源语言
     * @default 'zh'
     */
    sourceLanguage?: string;
    /**
     * 目标语言列表
     * @default ['en', 'zh-TW']
     */
    targetLanguages?: string[];
    /**
     * 是否转换代码中的中文为t函数
     * @default true
     */
    transformCode?: boolean;
    /**
     * 是否只在内存中转换代码（不修改源文件）
     * 主要用于开发环境，既能体验国际化效果又保持源代码干净
     * @default false
     */
    memoryTransformOnly?: boolean;
}
export interface Translation {
    source: string;
    translations: {
        [key: string]: string;
    };
}
export interface TranslationServiceOptions {
    apiKey?: string;
    apiProvider?: string;
    sourceLanguage?: string;
    targetLanguages?: string[];
    presets?: {
        [key: string]: {
            [key: string]: string;
        };
    };
}
export interface ChineseExtractorOptions {
    ignoreComments?: boolean;
}
export interface TransformerOptions {
    importStatement?: string;
    functionName?: string;
}
export interface BabelPluginOptions {
    functionName?: string;
}
export interface NodePath {
    node: any;
    parent: any;
    type: string;
    isStringLiteral: () => boolean;
    isTemplateLiteral: () => boolean;
    isJSXText: () => boolean;
    isJSXAttribute: () => boolean;
    replaceWith: (node: any) => void;
}
export declare const CHINESE_REGEX: RegExp;

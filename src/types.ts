/**
 * 输出语言文件的目录路径
 * @default './src/locales'
 */
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
  presets?: { [key: string]: { [key: string]: string } };

  /**
   * 日志级别:
   * - 'silent': 不输出(严重错误除外)
   * - 'minimal': 关键信息 + 关键阶段一次性摘要
   * - 'verbose': 全量日志 (默认)
   * @default 'verbose'
   */
  logLevel?: 'silent' | 'minimal' | 'verbose'
  /**
   * beforeCompile 等阶段重复日志的节流毫秒数
   * @default 5000
   */
  logThrottleMs?: number

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
  transformCode?: boolean

  /**
   * 是否只在内存中转换代码（不修改源文件）
   * 主要用于开发环境，既能体验国际化效果又保持源代码干净
   * @default false
   */
  memoryTransformOnly?: boolean

  /**
   * 是否转换emit阶段生成的代码（包括Vue的render函数）
   * 这是一个强大但危险的选项，会直接修改webpack输出的资产
   * @default false
   */
  transformEmittedCode?: boolean

  /**
   * 是否启用生产环境代码分析（emit阶段检测）
   * 用于分析最终打包产物中的翻译覆盖情况
   * @default false
   */
  enableProductionAnalysis?: boolean;

  /**
   * 代码风格配置
   */
  codeStyle?: {
    /**
     * 是否添加分号
     * @default false
     */
    semicolons?: boolean;
    
    /**
     * 引号风格
     * @default 'single'
     */
    quotes?: 'single' | 'double';
  };

  /**
   * 是否跳过已存在于翻译文件中的源文本的再次机器翻译
   * 仍会在代码中包裹 $t，但不再调用外部翻译服务
   * @default true
   */
  skipExistingTranslation?: boolean;

  /**
   * 调试：输出每个被提取或被过滤的中文字符串原因
   * @default false
   */
  debugExtraction?: boolean;
}

export interface Translation {
  source: string;
  translations: { [key: string]: string }
}

export interface TranslationServiceOptions {
  apiKey?: string;
  apiProvider?: string;
  sourceLanguage?: string;
  targetLanguages?: string[];
  presets?: { [key: string]: { [key: string]: string } }
}

export interface ChineseExtractorOptions {
  ignoreComments?: boolean
  debugExtraction?: boolean // 输出调试日志
}

export interface TransformerOptions {
  functionName?: string;
  semicolons?: boolean;
  quotes?: 'single' | 'double';
  globalFunctionName?: string; // 全局i18n函数名，用于props等不能使用this的地方
}

// 定义babel插件的类型
export interface BabelPluginOptions {
  functionName?: string
}

// 定义AST节点类型
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

// 定义中文字符的正则表达式
export const CHINESE_REGEX = /[\u4e00-\u9fa5]/

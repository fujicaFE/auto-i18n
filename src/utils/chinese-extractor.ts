import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { ChineseExtractorOptions, CHINESE_REGEX } from '../types';
import { ExtractionReporter } from './extraction-reporter';

export class ChineseExtractor {
  private options: ChineseExtractorOptions;
  private debug: boolean;
  private reporter: ExtractionReporter = new ExtractionReporter();
  private useReporter: boolean = false;

  constructor(options: ChineseExtractorOptions = {}) {
    this.options = {
      ignoreComments: true,
      ...options
    };
    this.debug = !!this.options.debugExtraction;
  }

  /**
   * 启用报告生成
   */
  enableReporting(enable: boolean = true) {
    this.useReporter = enable;
    if (!enable) {
      this.reporter.clear();
    }
  }

  /**
   * 获取报告
   */
  getReporter(): ExtractionReporter {
    return this.reporter;
  }

  /**
   * 从Vue文件中提取所有中文字符串
   * @param source Vue文件源代码
   */
  extractFromVueFile(source: string): string[] {
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/i);
    const scriptMatch = source.match(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/i);

    const results: string[] = [];

    if (templateMatch) {
      // 使用专门的模板解析器处理HTML模板
      const templateTexts = this.extractFromTemplate(templateMatch[1]);
      results.push(...templateTexts);
    }

    if (scriptMatch) {
      // 使用JavaScript AST解析器处理脚本部分
      const scriptTexts = this.extract(scriptMatch[2]);
      results.push(...scriptTexts);
    }

    // 后处理：过滤掉包含HTML标记或过长的文本
    return results.filter(text => this.isValidChineseText(text));
    const filtered: string[] = [];
    for (const text of results) {
      const valid = this.isValidChineseText(text);
      if (this.debug) console.log('[extractor][vue][filter]', valid ? 'keep' : 'skip', JSON.stringify(text));
      if (valid) filtered.push(text);
    }
    return filtered;
  }

  /**
   * 检查是否为有效的中文文本（排除HTML标记、正则表达式等）
   */
  private isValidChineseText(text: string): boolean {
    // 排除正则表达式字面量
    if (this.isRegexPattern(text)) {
      return false;
    }

    // 排除包含HTML标记的文本
    if (/<[^>]+>/.test(text) || /&\w+;/.test(text)) {
      return false;
    }
    
    // 排除HTML注释
    if (/<!--.*?-->/.test(text)) {
      return false;
    }
    
    // 注意：不再过滤已被$t()包装的文本，因为可能翻译文件丢失
    // 需要确保这些字符串在翻译文件中存在
    
    // 排除包含Vue插值表达式的文本（除非是纯中文部分）
    if (/\{\{.*?\}\}/.test(text)) {
      // 检查是否整个都是插值表达式
      if (text.trim().startsWith('{{') && text.trim().endsWith('}}')) {
        return false;
      }
      
      // 对于包含插值的文本，允许如果中文部分足够多
      const withoutInterpolation = text.replace(/\{\{.*?\}\}/g, '').trim();
      if (withoutInterpolation.length < 2 || !CHINESE_REGEX.test(withoutInterpolation)) {
        return false;
      }
    }
    
    // 排除包含大量特殊字符的文本
    if (/[\r\n\t]{2,}/.test(text)) {
      return false;
    }
    
    // 排除过长的文本（可能是整段HTML）
    if (text.length > 150) {
      return false;
    }
    
    // 排除主要包含英文字母和符号的文本
    const chineseCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    // 至少两个中文字符
    if (chineseCharCount < 2) return false;
    if (chineseCharCount < 2) {
      if (this.debug) console.log('[extractor][rule] <2 chinese chars', JSON.stringify(text));
      return false;
    }
    const totalLength = text.length;
    // 中文占比太低则忽略
    if (chineseCharCount / totalLength < 0.1) return false;
    if (chineseCharCount / totalLength < 0.1) {
      if (this.debug) console.log('[extractor][rule] ratio <0.1', JSON.stringify(text));
      return false;
    }

    return true;
  }

  /**
   * 从Vue模板中提取中文文本
   * @param template Vue模板HTML代码
   */
  extractFromTemplate(template: string): string[] {
    const chineseTexts = new Set<string>();

  // 1. 提取标签之间的纯文本内容（包括插值表达式）
  const textContentRegex = />([^<]*[\u4e00-\u9fff][^<]*)</g;
    let match;
    while ((match = textContentRegex.exec(template)) !== null) {
      const text = match[1].trim();
      if (text && CHINESE_REGEX.test(text) && !text.includes('\r') && !text.includes('\n')) {
        // 保留已包裹文本，后续统一过滤
        
        if (text.includes('{{')) {
          // 拆分插值，保留纯中文片段
            const segments = text.split(/\{\{[^}]*\}\}/).map(s => s.trim()).filter(Boolean);
            for (const seg of segments) {
              if (seg && CHINESE_REGEX.test(seg)) {
                chineseTexts.add(seg);
              }
            }
        } else {
          chineseTexts.add(text);
          if (this.debug) console.log('[extractor][template-text]', JSON.stringify(text));
        }
      }
    }

  // 2. 提取HTML属性值中的中文（扩展支持 label 等常见展示属性）
  const attrValueRegex = /(?:title|placeholder|label|alt|aria-label|data-[\w-]+)\s*=\s*["']([^"']*[\u4e00-\u9fff][^"']*)["']/gi;
    while ((match = attrValueRegex.exec(template)) !== null) {
      const text = match[1].trim();
      if (text && CHINESE_REGEX.test(text)) {
        chineseTexts.add(text);
        if (this.debug) console.log('[extractor][attr]', JSON.stringify(text));
      }
    }

    // 3. 提取Vue指令中的字符串字面量
    const vueDirectiveRegex = /(?:v-bind:|\:)(\w+)\s*=\s*["']'([^']*[\u4e00-\u9fff][^']*)'["']/gi;
    while ((match = vueDirectiveRegex.exec(template)) !== null) {
      const text = match[2].trim();
      if (text && CHINESE_REGEX.test(text)) {
        chineseTexts.add(text);
        if (this.debug) console.log('[extractor][directive]', JSON.stringify(text));
      }
    }

    // 4. 从字符串字面量中提取中文（只在引号内）
    const stringLiteralRegex = /['"]([^'"]*[\u4e00-\u9fff][^'"]{0,50})['"]/g;
    while ((match = stringLiteralRegex.exec(template)) !== null) {
      const text = match[1].trim();
      if (text && CHINESE_REGEX.test(text) && !text.includes('<') && !text.includes('>')) {
        chineseTexts.add(text);
        if (this.debug) console.log('[extractor][template-string]', JSON.stringify(text));
      }
    }

    // 5. 从插值表达式中提取字符串字面量（排除$t()函数）
    const interpolationBlocks = template.match(/\{\{[^}]+\}\}/g);
    if (interpolationBlocks) {
      for (const block of interpolationBlocks) {
        // 跳过已经使用$t()的插值表达式
        if (/\$t\s*\(/.test(block)) {
          continue;
        }
        
        const stringInInterpolation = /['"]([^'"]*[\u4e00-\u9fff][^'"]*)['"]/g;
        let interpolationMatch;
        while ((interpolationMatch = stringInInterpolation.exec(block)) !== null) {
          const text = interpolationMatch[1].trim();
          if (text && CHINESE_REGEX.test(text)) {
            chineseTexts.add(text);
            if (this.debug) console.log('[extractor][interpolation-string]', JSON.stringify(text));
          }
        }
      }
    }

    // 6. 捕获已被 $t('文本') / i18n.t('文本') / window.$t('文本') 包裹但翻译文件可能缺失的 key
    const wrappedCallRegex = /(?:\$t|i18n\.t|window\.\$t)\(\s*['"]([^'"\n\r]*[\u4e00-\u9fff][^'"\n\r]*)['"]\s*\)/g;
    let wrappedMatch;
    while ((wrappedMatch = wrappedCallRegex.exec(template)) !== null) {
      const txt = wrappedMatch[1].trim();
      if (txt) chineseTexts.add(txt);
      if (txt) {
        chineseTexts.add(txt);
        if (this.debug) console.log('[extractor][wrapped-call]', JSON.stringify(txt));
      }
    }

    return Array.from(chineseTexts);
  }

  /**
   * 从JS文件中提取所有中文字符串
   * @param source JS文件源代码
   */
  extractFromJsFile(source: string): string[] {
    return this.extract(source);
  }

  /**
   * 从源代码中提取所有中文字符串
   * @param source 源代码
   * @param filePath 文件路径（可选，用于日志）
   */
  extract(source: string, filePath?: string): string[] {
    const chineseTexts = new Set<string>();

    try {
      // 解析源代码为AST
      const ast = parser.parse(source, {
        sourceType: 'unambiguous',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        strictMode: false,
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'asyncGenerators',
          'functionBind',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining',
          'bigInt',
          'optionalCatchBinding',
          'numericSeparator',
          'importMeta',
          'privateIn',
          'topLevelAwait',
          'v8intrinsic'
        ],
      });

      // 遍历AST寻找中文字符串
      traverse(ast, {
        // 处理字符串字面量
        StringLiteral: (path) => {
          const { node, parent } = path;

          // 忽略注释中的中文
          if (this.options.ignoreComments && this.isInComment(path)) {
            return;
          }

          // 检查是否含有中文
          if (CHINESE_REGEX.test(node.value)) {
            chineseTexts.add(node.value);
            if (this.useReporter) {
              this.reporter.addItem(node.value, 'ast', 'StringLiteral');
            }
            if (this.debug) console.log('[extractor][script-string]', JSON.stringify(node.value));
          }
        },

        // 处理模板字面量
        TemplateLiteral: (path) => {
          const { node } = path;

          // 忽略注释中的中文
          if (this.options.ignoreComments && this.isInComment(path)) {
            return;
          }

          // 检查模板字符串中的静态部分是否含有中文
          for (const quasi of node.quasis) {
            if (CHINESE_REGEX.test(quasi.value.raw)) {
              const chineseSegments = this.extractChineseSegments(quasi.value.raw);
              for (const segment of chineseSegments) {
                if (segment.trim()) {
                  chineseTexts.add(segment);
                  if (this.useReporter) {
                    this.reporter.addItem(segment, 'ast', 'TemplateLiteral');
                  }
                  if (this.debug) console.log('[extractor][script-template-seg]', JSON.stringify(segment));
                }
              }
            }
          }
        },

        // 处理JSX文本
        JSXText: (path) => {
          const { node } = path;
          if (CHINESE_REGEX.test(node.value)) {
            const trimmed = node.value.trim();
            if (trimmed) {
              const chineseSegments = this.extractChineseSegments(trimmed);
              for (const segment of chineseSegments) {
                if (segment.trim()) {
                  chineseTexts.add(segment);
                  if (this.useReporter) {
                    this.reporter.addItem(segment, 'ast', 'JSXText');
                  }
                  if (this.debug) console.log('[extractor][jsx-text]', JSON.stringify(segment));
                }
              }
            }
          }
        },

        // 处理JSX属性值
        JSXAttribute: (path) => {
          const { node } = path;

          // 检查JSX属性值是否为字符串字面量并且含有中文
          if (t.isStringLiteral(node.value) && CHINESE_REGEX.test(node.value.value)) {
            chineseTexts.add(node.value.value);
            if (this.useReporter) {
              this.reporter.addItem(node.value.value, 'ast', 'JSXAttribute');
            }
            if (this.debug) console.log('[extractor][jsx-attr]', JSON.stringify(node.value.value));
          }
        }
      });

      // 捕获 JS 中的 $t('...') / i18n.t('...') / window.$t('...') 调用里的中文（避免已包裹但未进翻译文件）
      const wrappedCallRegexJs = /(?:\$t|i18n\.t|window\.\$t)\(\s*['"]([^'"\n\r]*[\u4e00-\u9fff][^'"\n\r]*)['"]\s*\)/g;
      let jsMatch;
      while ((jsMatch = wrappedCallRegexJs.exec(source)) !== null) {
        const inner = jsMatch[1].trim();
        if (inner) {
          chineseTexts.add(inner);
          if (this.debug) console.log('[extractor][script-wrapped-call]', JSON.stringify(inner));
        }
      }

    } catch (error: any) {
      // 解析失败：在非调试模式下静默回退，避免噪音。调试模式下仅报告非 CSS 语法类错误。
      const msg: string = error?.message || '';
      const isCssLike = /Unexpected token ':'/.test(msg) || /Missing semicolon/.test(msg) || /Identifier directly after number/.test(msg);
      if (this.debug && !isCssLike) {
        // 仅输出对脚本真正有帮助的解析错误，忽略常见由内联样式或 CSS 片段导致的报错
        console.error(`解析文件失败 ${filePath || '未知文件'}:`, msg);
      }
      // 当AST解析失败时，使用简单的正则表达式方法作为回退
      return this.extractByRegex(source);
    }

    return Array.from(chineseTexts);
  }

  /**
   * 使用正则表达式方法提取中文（回退方案）
   */
  private extractByRegex(source: string): string[] {
    const chineseTexts = new Set<string>();
    
    // 匹配字符串字面量中的中文
    const stringMatches = source.match(/['"`]([^'"`]*[\u4e00-\u9fff]+[^'"`]*)['"`]/g);
    if (stringMatches) {
      for (const match of stringMatches) {
        const content = match.slice(1, -1); // 去掉引号
        if (CHINESE_REGEX.test(content)) {
          chineseTexts.add(content);
          if (this.useReporter) {
            this.reporter.addItem(content, 'regex', 'StringLiteral');
          }
        }
      }
    }
    
    // 匹配模板字符串中的中文
    const templateMatches = source.match(/`([^`]*[\u4e00-\u9fff]+[^`]*)`/g);
    if (templateMatches) {
      for (const match of templateMatches) {
        const content = match.slice(1, -1); // 去掉反引号
        const segments = this.extractChineseSegments(content);
        for (const segment of segments) {
          if (segment.trim()) {
            chineseTexts.add(segment);
            if (this.useReporter) {
              this.reporter.addItem(segment, 'regex', 'TemplateLiteral');
            }
          }
        }
      }
    }
    
    return Array.from(chineseTexts);
  }

  /**
   * 检查是否为正则表达式模式
   * 正则中的中文通常是字符集匹配，不应国际化
   */
  private isRegexPattern(text: string): boolean {
    // 检查是否以 / 开头和结尾（正则字面量格式）
    if (/^\/.*\/$/.test(text) || /^\/.*\/[gimsuvy]*$/.test(text)) {
      return true;
    }

    // 检查是否包含典型的正则表达式特征字符
    const regexFeatures = [
      /\[\^?[^\]]+\]/,           // 字符集 [a-z] [^abc]
      /\(\?[:=!]/,                // 非捕获组、前瞻、后顾
      /\{\d+,?\d*\}/,            // 量词 {n,m}
      /\\[dDwWsS]/,              // 元字符
      /[+*?]\??/,                 // 贪婪/非贪婪量词
      /\|.*\|/,                   // 多选分支
      /\^[^\s]/,                  // 开头锚点
      /[^\s]\$/,                  // 结尾锚点
    ];

    // 如果包含多个正则特征，认为是正则表达式
    let featureCount = 0;
    for (const feature of regexFeatures) {
      if (feature.test(text)) {
        featureCount++;
        if (featureCount >= 2) {
          return true;
        }
      }
    }

    // 检查是否包含大量正则转义字符
    const escapeCount = (text.match(/\\./g) || []).length;
    if (escapeCount > 3) {
      return true;
    }

    return false;
  }

  /**
   * 检查节点是否在注释中
   */
  private isInComment(path: any): boolean {
    // 这是一个简化的实现，实际上需要检查AST位置和注释的位置
    // 在实际使用中，可能需要更复杂的算法来准确判断
    // 此处简单返回false，后续可以根据需要完善
    return false;
  }

  /**
   * 从文本中提取中文片段
   */
  private extractChineseSegments(text: string): string[] {
    // 简单实现：将文本按照非中文字符分割
    // 这个实现可能不够精确，实际应用中可能需要更复杂的分词算法
    const segments: string[] = [];
    let currentSegment = '';
    let hasChinese = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const isChinese = CHINESE_REGEX.test(char);

      if (isChinese) {
        hasChinese = true;
        currentSegment += char;
      } else {
        // 非中文字符，如果是空格或标点，并且当前片段不为空，则继续添加
        if ((char === ' ' || /[\.,\?!;:，。？！；：]/.test(char)) && currentSegment) {
          currentSegment += char;
        } else {
          // 如果当前片段不为空且含有中文，保存它
          if (currentSegment && hasChinese) {
            segments.push(currentSegment.trim());
          }

          // 重置
          currentSegment = '';
          hasChinese = false;
        }
      }
    }

    // 处理最后一个片段
    if (currentSegment && hasChinese) {
      segments.push(currentSegment.trim());
    }

    return segments;
  }
}

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { TransformerOptions } from '../types';

export class Transformer {
  private options: TransformerOptions;

  constructor(options: TransformerOptions = {}) {
    this.options = {
      functionName: '$t',
      semicolons: false, // 默认不添加分号
      quotes: 'single', // 默认使用单引号
      globalFunctionName: 'i18n.t', // 默认全局函数名
      ...options
    };
  }

  /**
   * 转换源代码中的中文字符串为i18n调用
   * @param source 源代码
   * @param translations 翻译映射，source -> { locale -> text }
   */
  transform(source: string, translations: Record<string, Record<string, string>>): string {
    // 检查是否是 Vue 文件
    if (source.includes('<template>') && source.includes('</template>')) {
      return this.transformVueFile(source, translations);
    } else {
      return this.transformJavaScript(source, translations);
    }
  }

  /**
   * 转换 Vue 单文件组件
   */
  private transformVueFile(source: string, translations: Record<string, Record<string, string>>): string {
    try {
      // 简单的正则匹配来分离 template 和 script 部分
      const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/);
      const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/g);

      let transformedSource = source;

      // 处理 template 部分
      if (templateMatch) {
        const originalTemplate = templateMatch[1];
        const transformedTemplate = this.transformVueTemplate(originalTemplate, translations);
        if (transformedTemplate !== originalTemplate) {
          transformedSource = transformedSource.replace(templateMatch[0], 
            `<template>${transformedTemplate}</template>`);
        }
      }

      // 处理 script 部分
      if (scriptMatch) {
        const originalScript = scriptMatch[1];
        const transformedScript = this.transformJavaScript(originalScript, translations);
        if (transformedScript !== originalScript) {
          transformedSource = transformedSource.replace(scriptMatch[0], 
            `<script>${transformedScript}</script>`);
        }
      }

      return transformedSource;
    } catch (error) {
      console.error('转换Vue文件失败:', error);
      return source;
    }
  }

  /**
   * 转换 Vue 模板中的中文文本
   */
  private transformVueTemplate(template: string, translations: Record<string, Record<string, string>>): string {
    let transformedTemplate = template;

    // 1. 处理Vue插值表达式中的字符串 {{ '中文' }} -> {{ $t('中文') }}
    const interpolationRegex = /\{\{\s*'([^']*[\u4e00-\u9fff][^']*)'\s*\}\}/g;
    transformedTemplate = transformedTemplate.replace(interpolationRegex, (match, chineseText) => {
      if (translations[chineseText]) {
        console.log(`Vue Template: 转换插值表达式 {{ '${chineseText}' }} -> {{ $t('${chineseText}') }}`);
        return `{{ $t('${chineseText}') }}`;
      }
      return match;
    });

    // 2. 处理Vue插值表达式中的双引号字符串 {{ "中文" }} -> {{ $t("中文") }}
    const doubleQuoteInterpolationRegex = /\{\{\s*"([^"]*[\u4e00-\u9fff][^"]*)"\s*\}\}/g;
    transformedTemplate = transformedTemplate.replace(doubleQuoteInterpolationRegex, (match, chineseText) => {
      if (translations[chineseText]) {
        console.log(`Vue Template: 转换插值表达式 {{ "${chineseText}" }} -> {{ $t("${chineseText}") }}`);
        return `{{ $t("${chineseText}") }}`;
      }
      return match;
    });

    // 3. 处理HTML标签间的直接中文文本，包括与Vue表达式混合的情况
    // 处理 >中文{{ expr }}< 和 >中文< 的情况
    const mixedTextRegex = />([^<]*[\u4e00-\u9fff][^<]*?)(\{\{[^}]*\}\}|<)/g;
    transformedTemplate = transformedTemplate.replace(mixedTextRegex, (match, chineseText, following) => {
      const trimmedText = chineseText.trim();
      if (trimmedText && translations[trimmedText] && !trimmedText.includes('{{')) {
        console.log(`Vue Template: 转换混合文本 >${trimmedText}... -> >{{ $t('${trimmedText}') }}...`);
        return `>{{ $t('${trimmedText}') }}${following}`;
      }
      return match;
    });

    // 处理纯文本情况 >中文<
    const directTextRegex = />([^<]*[\u4e00-\u9fff][^<]*)</g;
    // 处理形如 {{ expr }} 中文  (插值表达式后紧跟纯中文) 的场景
    const interpolationThenChineseRegex = />\s*((?:\{\{[^}]+\}\}\s*)+)([\u4e00-\u9fff][^<]*)</g;
    transformedTemplate = transformedTemplate.replace(interpolationThenChineseRegex, (match, interpPart, chinesePart) => {
      const pureChinese = chinesePart.trim();
      if (!pureChinese || pureChinese.includes('{{') || pureChinese.includes('$t(')) {
        return match; // 已处理或包含再次插值，跳过
      }
      // 保留原有插值尾部空白（interpPart 已含结尾空白），若无空白则补一个
      const needsSpace = !/\s$/.test(interpPart);
      const space = needsSpace ? ' ' : '';
      console.log(`Vue Template: 转换插值后中文 ${pureChinese} -> {{ $t('${pureChinese}') }}`);
      // 重要：补回匹配中被消耗的 < 以保持后续关闭标签，如 </p>
      return `>${interpPart}${space}{{ $t('${pureChinese}') }}<`;
    });
    transformedTemplate = transformedTemplate.replace(directTextRegex, (match, chineseText) => {
      const trimmedText = chineseText.trim();
      if (trimmedText && translations[trimmedText] && !trimmedText.includes('{{') && !trimmedText.includes('$t(')) {
        console.log(`Vue Template: 转换直接文本 >${trimmedText}< -> >{{ $t('${trimmedText}') }}<`);
        return `>{{ $t('${trimmedText}') }}<`;
      }
      return match;
    });

    // 4. 处理属性中的中文字符串（不再要求已有翻译，只要含中文就包裹）
    // 支持带连字符、以及前缀 : @ v- 等（避免重复处理已绑定）
    const attributeRegex = /([:@]?[-\w]+)=["']([^"']*[\u4e00-\u9fff][^"']*)["']/g;
    transformedTemplate = transformedTemplate.replace(attributeRegex, (match, attrName, chineseText) => {
      // 已经是绑定表达式或已含 $t 跳过
      if (match.includes('$t(')) return match;
      // 忽略 class/id/style
      const pureName = attrName.replace(/^[:@]/, '');
      if (['class', 'id', 'style'].includes(pureName)) return match;
      // 如果本来就是绑定 (: 或 v-bind:) 直接替换值部分
      if (attrName.startsWith(':')) {
        return `${attrName}="$t('${chineseText}')"`;
      }
      // 普通静态属性转为绑定属性
      return `:${attrName}="$t('${chineseText}')"`;
    });

    return transformedTemplate;
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 检测源代码的代码风格
   */
  private detectCodeStyle(source: string): { semicolons: boolean; quotes: 'single' | 'double' } {
    // 检测分号使用情况 - 更准确的检测
    const semicolonRegex = /[;}]\s*$/gm;
    const statementRegex = /^[\s]*(?:var|let|const|function|import|export|return)\s+.+$/gm;
    
    const semicolonMatches = source.match(semicolonRegex) || [];
    const statementMatches = source.match(statementRegex) || [];
    
    // 检测引号使用情况 - 排除模板字符串和注释
    const stringRegex = /(['"])[^'"]*\1/g;
    const stringMatches = source.match(stringRegex) || [];
    
    let singleQuoteCount = 0;
    let doubleQuoteCount = 0;
    
    for (const match of stringMatches) {
      if (match.startsWith("'")) {
        singleQuoteCount++;
      } else if (match.startsWith('"')) {
        doubleQuoteCount++;
      }
    }
    
    return {
      semicolons: statementMatches.length > 0 ? (semicolonMatches.length / statementMatches.length) > 0.3 : true,
      quotes: singleQuoteCount >= doubleQuoteCount ? 'single' : 'double'
    };
  }

  /**
   * 转换 JavaScript 代码
   */
  private transformJavaScript(source: string, translations: Record<string, Record<string, string>>): string {
    try {
      // 使用用户配置的代码风格，如果没有配置则检测
      const codeStyle = {
        semicolons: this.options.semicolons !== undefined ? this.options.semicolons : this.detectCodeStyle(source).semicolons,
        quotes: this.options.quotes || this.detectCodeStyle(source).quotes
      };
      
      // 解析源代码为AST
      const ast = parser.parse(source, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'dynamicImport',
        ],
      });

      // 检查是否需要转换
      let hasI18nUsage = false;

      // 遍历AST寻找中文字符串并替换
      const self = this; // 保存this上下文以避免在traverse回调中丢失
      traverse(ast, {
        // 检查是否已有$t函数的使用
        CallExpression(path: any) {
          const { node } = path;
          if (
            t.isMemberExpression(node.callee) &&
            t.isThisExpression(node.callee.object) &&
            t.isIdentifier(node.callee.property) &&
            node.callee.property.name === '$t'
          ) {
            hasI18nUsage = true;
          } else if (
            t.isIdentifier(node.callee) &&
            node.callee.name === '$t'
          ) {
            hasI18nUsage = true;
          }
        },

        // 替换字符串字面量
        StringLiteral(path: any) {
          const { node, parent } = path;

          // 检查是否是已知的中文字符串
          if (translations[node.value]) {
            // 如果当前字符串是对象属性的 key ("label": '中文') 这样的 key 位置，不应替换为调用
            if (t.isObjectProperty(parent) && parent.key === node) {
              return;
            }
            // 若在 ObjectMethod key 位置也跳过
            if (t.isObjectMethod && t.isObjectMethod(parent) && parent.key === node) {
              return;
            }
            // 不处理import语句中的字符串
            if (t.isImportDeclaration(parent) || path.parentPath && path.parentPath.isImportDeclaration()) {
              return;
            }

            // 不处理已经在i18n调用中的字符串
            if (self.isInI18nCall(path, self.options.functionName || '$t')) {
              return;
            }

            // 检查是否在Vue组件上下文中（方法、计算属性等）
            const shouldUseThis = self.isInVueComponentContext(path);
            const isInProps = self.isInPropsDefault(path);
            let i18nCall;
            if (isInProps) {
              const callee = self.buildCalleeFromDotted(self.options.globalFunctionName || 'i18n.t');
              i18nCall = t.callExpression(callee, [t.stringLiteral(node.value)]);
            } else if (shouldUseThis) {
              i18nCall = t.callExpression(
                t.memberExpression(
                  t.thisExpression(),
                  t.identifier(self.options.functionName || '$t')
                ),
                [t.stringLiteral(node.value)]
              );
            } else {
              // 普通上下文：优先使用全局函数（如果配置了），否则使用本地函数名
              if (self.options.globalFunctionName) {
                const callee = self.buildCalleeFromDotted(self.options.globalFunctionName);
                i18nCall = t.callExpression(callee, [t.stringLiteral(node.value)]);
              } else {
                i18nCall = t.callExpression(
                  t.identifier(self.options.functionName || '$t'),
                  [t.stringLiteral(node.value)]
                );
              }
            }

            path.replaceWith(i18nCall);
            hasI18nUsage = true;
          }
        },

        // 处理JSX属性中的中文字符串
        JSXAttribute(path: any) {
          const { node } = path;

          if (t.isStringLiteral(node.value) && translations[node.value.value]) {
            // 检查是否需要使用this
            const shouldUseThis = self.isInVueComponentContext(path);
            
            // 创建合适的函数调用
            const i18nCall = shouldUseThis 
              ? t.callExpression(
                  t.memberExpression(
                    t.thisExpression(),
                    t.identifier(self.options.functionName || '$t')
                  ),
                  [t.stringLiteral(node.value.value)]
                )
              : t.callExpression(
                  t.identifier(self.options.functionName || '$t'),
                  [t.stringLiteral(node.value.value)]
                );

            // 用JSXExpressionContainer包装
            const jsxExpr = t.jSXExpressionContainer(i18nCall);

            // 替换属性值
            node.value = jsxExpr;
            hasI18nUsage = true;
          }
        },

        // 处理JSX文本中的中文
        JSXText(path: any) {
          const { node } = path;
          const text = node.value.trim();

          if (text && translations[text]) {
            // 检查是否需要使用this
            const shouldUseThis = self.isInVueComponentContext(path);
            
            // 创建合适的函数调用
            const i18nCall = shouldUseThis 
              ? t.callExpression(
                  t.memberExpression(
                    t.thisExpression(),
                    t.identifier(self.options.functionName || '$t')
                  ),
                  [t.stringLiteral(text)]
                )
              : t.callExpression(
                  t.identifier(self.options.functionName || '$t'),
                  [t.stringLiteral(text)]
                );

            // 用JSXExpressionContainer包装
            const jsxExpr = t.jSXExpressionContainer(i18nCall);

            // 替换JSX文本
            path.replaceWith(jsxExpr);
            hasI18nUsage = true;
          }
        }
      });

      // 生成代码，保持原始代码风格
      const output = generate(ast, {
        retainLines: true,
        compact: false,
        semicolons: codeStyle.semicolons, // 根据检测到的风格决定是否添加分号
        quotes: codeStyle.quotes, // 使用检测到的引号风格
        jsescOption: {
          minimal: true,
          quotes: codeStyle.quotes
        }
      }, source);

      return output.code;
    } catch (error) {
      console.error('转换代码失败:', error);
      return source; // 发生错误时返回原始代码
    }
  }

  /**
   * 检查节点是否在Vue组件上下文中（需要使用this.$t）
   */
  private isInVueComponentContext(path: any): boolean {
    let parent = path.parentPath;
    
    while (parent) {
      // 检查是否在 props 定义中，props 中不能使用 this.$t
      if (parent.isObjectProperty() && t.isIdentifier(parent.node.key) && parent.node.key.name === 'props') {
        return false;
      }
      
      // 检查是否在 props 的 default 值中
      if (this.isInPropsDefault(parent)) {
        return false;
      }
      
      // 检查是否在对象方法中（Vue组件的methods、computed等）
      if (parent.isObjectMethod() || parent.isFunctionExpression() || parent.isArrowFunctionExpression()) {
        // 检查是否在Vue组件的选项对象中
        let objectParent = parent.parentPath;
        while (objectParent) {
          if (objectParent.isObjectExpression()) {
            // 查找可能的Vue组件特征
            const properties = objectParent.node.properties;
            const hasVueProperties = properties.some((prop: any) => {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                const keyName = prop.key.name;
                return ['data', 'methods', 'computed', 'watch', 'mounted', 'created', 'beforeMount', 'beforeDestroy', 'destroyed'].includes(keyName);
              }
              return false;
            });
            
            if (hasVueProperties) {
              return true;
            }
          }
          objectParent = objectParent.parentPath;
        }
      }
      
      // 检查是否在Vue组件的export default中
      if (parent.isExportDefaultDeclaration()) {
        return true;
      }
      
      parent = parent.parentPath;
    }
    
    return false;
  }

  /**
   * 检查是否在 props 的 default 值中
   */
  private isInPropsDefault(path: any): boolean {
    // 向上找最近的 default ObjectProperty
    let current: any = path;
    let defaultProp: any = null;
    while (current) {
      if (current.isObjectProperty && current.isObjectProperty() && t.isIdentifier(current.node.key) && current.node.key.name === 'default') {
        defaultProp = current;
        break;
      }
      current = current.parentPath;
    }
    if (!defaultProp) return false;
    // 确认当前节点位于 default 的 value 子树中
    // （已通过向上链找到 default，视为成立）
    // 继续向上查找 props 属性
    let scan = defaultProp.parentPath; // ObjectExpression (prop define body)
    while (scan) {
      if (scan.isObjectProperty && scan.isObjectProperty() && t.isIdentifier(scan.node.key) && scan.node.key.name === 'props') {
        return true;
      }
      scan = scan.parentPath;
    }
    return false;
  }

  /**
   * 检查节点是否已经在i18n函数调用中
   */
  private isInI18nCall(path: any, functionName: string): boolean {
    let parent = path.parentPath;
    while (parent) {
      if (parent.isCallExpression()) {
        const callee = parent.node.callee;
        if (t.isIdentifier(callee) && callee.name === functionName) return true;
        if (t.isMemberExpression(callee) && t.isIdentifier(callee.property) && callee.property.name === functionName) return true;
        if (this.options.globalFunctionName && this.matchesGlobalFunctionChain(callee, this.options.globalFunctionName)) return true;
      }
      parent = parent.parentPath;
    }
    return false;
  }

  private buildCalleeFromDotted(dotted: string): t.Expression {
    const parts = dotted.split('.');
    let expr: t.Expression = t.identifier(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      expr = t.memberExpression(expr, t.identifier(parts[i]));
    }
    return expr;
  }

  private matchesGlobalFunctionChain(callee: any, dotted: string): boolean {
    const parts = dotted.split('.');
    const collected: string[] = [];
    let cur: any = callee;
    // 向内剥离 memberExpression，逆向收集
    while (t.isMemberExpression(cur)) {
      if (t.isIdentifier(cur.property)) {
        collected.unshift(cur.property.name);
      } else {
        return false;
      }
      if (t.isIdentifier(cur.object)) {
        collected.unshift(cur.object.name);
        break;
      } else {
        cur = cur.object;
      }
    }
    return collected.join('.') === parts.join('.');
  }
}

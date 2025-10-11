import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { TransformerOptions } from '../types';

export class Transformer {
  private options: TransformerOptions;

  constructor(options: TransformerOptions = {}) {
    this.options = {
      importStatement: "import { useI18n } from 'vue-i18n'",
      functionName: '$t',
      ...options
    };
  }

  /**
   * 转换源代码中的中文字符串为i18n调用
   * @param source 源代码
   * @param translations 翻译映射，source -> { locale -> text }
   */
  transform(source: string, translations: Record<string, Record<string, string>>): string {
    try {
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

      // 检查是否需要添加import语句
      let hasI18nImport = false;
      let hasI18nUsage = false;

      // 遍历AST寻找中文字符串并替换
      traverse(ast, {
        // 检查是否已有i18n的import
        ImportDeclaration(path: any) {
          const { node } = path;
          if (node.source.value === 'vue-i18n') {
            hasI18nImport = true;
          }
        },

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
            // 不处理import语句中的字符串
            if (t.isImportDeclaration(parent) || path.parentPath && path.parentPath.isImportDeclaration()) {
              return;
            }

            // 不处理已经在i18n调用中的字符串
            if (this.isInI18nCall(path, this.options.functionName || '$t')) {
              return;
            }

            // 替换为$t函数调用
            const i18nCall = t.callExpression(
              t.identifier(this.options.functionName || '$t'),
              [t.stringLiteral(node.value)]
            );

            // 添加原文注释 - 由于TypeScript类型问题，暂时注释掉
            // i18nCall.leadingComments = [{
            //   type: 'CommentLine',
            //   value: ` ${node.value}`
            // }];

            path.replaceWith(i18nCall);
            hasI18nUsage = true;
          }
        },

        // 处理JSX属性中的中文字符串
        JSXAttribute(path: any) {
          const { node } = path;

          if (t.isStringLiteral(node.value) && translations[node.value.value]) {
            // 替换为JSX表达式，内部是$t函数调用
            const i18nCall = t.callExpression(
              t.identifier(this.options.functionName || '$t'),
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
            // 创建i18n函数调用
            const i18nCall = t.callExpression(
              t.identifier(this.options.functionName || '$t'),
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

      // 如果有$t函数的使用但没有对应的import，添加import语句
      if (hasI18nUsage && !hasI18nImport && this.options.importStatement) {
        const importAst = parser.parse(this.options.importStatement, {
          sourceType: 'module',
        });

        if (importAst.program.body.length > 0 && t.isImportDeclaration(importAst.program.body[0])) {
          // 在文件开头插入import语句
          ast.program.body.unshift(importAst.program.body[0]);
        }
      }

      // 生成代码
      const output = generate(ast, {
        retainLines: true,
        compact: false,
        jsescOption: {
          minimal: true
        }
      }, source);

      return output.code;
    } catch (error) {
      console.error('转换代码失败:', error);
      return source; // 发生错误时返回原始代码
    }
  }

  /**
   * 检查节点是否已经在i18n函数调用中
   */
  private isInI18nCall(path: any, functionName: string): boolean {
    let parent = path.parentPath;

    while (parent) {
      if (
        parent.isCallExpression() &&
        ((t.isIdentifier(parent.node.callee) && parent.node.callee.name === functionName) ||
         (t.isMemberExpression(parent.node.callee) &&
          t.isIdentifier(parent.node.callee.property) &&
          parent.node.callee.property.name === functionName))
      ) {
        return true;
      }
      parent = parent.parentPath;
    }

    return false;
  }
}

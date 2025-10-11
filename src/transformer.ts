import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import generate from '@babel/generator'
import { CHINESE_REGEX, BabelPluginOptions } from './types'

/**
 * 代码转换工具类 - 将中文字符串替换为i18n函数调用
 */
class Transformer {
  /**
   * 转换JS文件中的中文字符串为i18n函数调用
   * @param source 源代码
   * @param options 转换选项
   * @returns 转换后的代码
   */
  transformJsFileToI18n(source: string, options: BabelPluginOptions = {}): string {
    return this.transform(source, options)
  }

  /**
   * 转换Vue文件中的中文字符串为i18n函数调用
   * @param source Vue文件内容
   * @param options 转换选项
   * @returns 转换后的代码
   */
  transformVueFileToI18n(source: string, options: BabelPluginOptions = {}): string {
    // Vue 文件包含模板和脚本部分，需要分别处理
    // 这里使用简单的字符串分割方式，实际应用中可能需要使用专门的Vue解析器

    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/i)
    const scriptMatch = source.match(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/i)

    if (!templateMatch && !scriptMatch) {
      return source
    }

    let result = source

    // 处理脚本部分
    if (scriptMatch) {
      const scriptContent = scriptMatch[2]
      const transformedScript = this.transform(scriptContent, options)

      if (transformedScript !== scriptContent) {
        result = result.replace(scriptContent, transformedScript)
      }
    }

    // 处理模板部分
    if (templateMatch) {
      const templateContent = templateMatch[1]
      const functionName = options.functionName || '$t'

      let transformedTemplate = templateContent

      // 1. 替换属性值中的中文
      // 如: <div title="中文内容"> -> <div :title="$t('中文内容')">
      transformedTemplate = transformedTemplate.replace(
        /(\s\w+)=["']([^"']*[\u4e00-\u9fa5][^"']*)["']/g,
        (match, attr, value) => {
          if (CHINESE_REGEX.test(value)) {
            // 确保属性名不是v-开头的指令，这些需要特殊处理
            if (!attr.trim().startsWith('v-')) {
              return `${attr.replace(/^\s+/, ' :')}="${functionName}('${value.replace(/'/g, "\\'")}')"`
            }
          }
          return match
        }
      )

      // 2. 替换v-指令中的中文值
      // 如: <div v-text="'中文内容'"> -> <div v-text="$t('中文内容')">
      transformedTemplate = transformedTemplate.replace(
        /(\sv-(text|html|bind:[^=]+))=["']'([^"']*[\u4e00-\u9fa5][^"']*)'["']/g,
        (match, directive, _, value) => {
          if (CHINESE_REGEX.test(value)) {
            return `${directive}="${functionName}('${value.replace(/'/g, "\\'")}')"`
          }
          return match
        }
      )

      // 3. 替换文本节点中的中文，但排除已经有 {{ }} 表达式的部分
      transformedTemplate = transformedTemplate.replace(
        />([^<{]*[\u4e00-\u9fa5][^<{]*)</g,
        (match, text) => {
          if (CHINESE_REGEX.test(text.trim())) {
            return `>{{ ${functionName}('${text.trim().replace(/'/g, "\\'")}')}}</`
          }
          return match
        }
      )

      // 4. 处理包含中文的 {{ }} 表达式内的字符串字面量
      transformedTemplate = transformedTemplate.replace(
        /{{([^}]*['"]([^'"]*[\u4e00-\u9fa5][^'"]*)['"](.*?))}}/g,
        (match, expr, chineseText) => {
          if (CHINESE_REGEX.test(chineseText)) {
            // 如果表达式中包含中文字符串字面量，替换为 $t 调用
            const modifiedExpr = expr.replace(
              /(['"])([^'"]*[\u4e00-\u9fa5][^'"]*)(['"])/g,
              (_, quote1, text, quote2) => {
                return `${functionName}(${quote1}${text}${quote2})`
              }
            )
            return `{{ ${modifiedExpr} }}`
          }
          return match
        }
      )

      if (transformedTemplate !== templateContent) {
        result = result.replace(templateContent, transformedTemplate)
      }
    }

    return result
  }

  /**
   * 通用转换函数，将代码中的中文字符串替换为i18n函数调用
   * @param source 源代码
   * @param options 转换选项
   * @returns 转换后的代码
   */
  private transform(source: string, options: BabelPluginOptions = {}): string {
    try {
      // 解析源代码为AST
      const ast = parser.parse(source, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy']
      })

      const functionName = options.functionName || '$t'

      // 遍历AST并进行转换
      traverse(ast, {
        StringLiteral(path) {
          const { node } = path

          // 只处理包含中文的字符串
          if (CHINESE_REGEX.test(node.value)) {
            // 不处理已经在t函数调用中的字符串
            if (isInI18nCall(path, functionName)) {
              return
            }

            // 不处理import语句中的字符串
            if (t.isImportDeclaration(path.parent)) {
              return
            }

            // 替换为t函数调用
            const i18nCall = t.callExpression(
              t.identifier(functionName),
              [t.stringLiteral(node.value)]
            )

            path.replaceWith(i18nCall)
          }
        },

        JSXAttribute(path) {
          const { node } = path

          if (
            t.isStringLiteral(node.value) &&
            CHINESE_REGEX.test(node.value.value)
          ) {
            // 替换为JSX表达式，包含t函数调用
            const i18nCall = t.callExpression(
              t.identifier(functionName),
              [t.stringLiteral(node.value.value)]
            )

            node.value = t.jsxExpressionContainer(i18nCall)
          }
        },

        JSXText(path) {
          const { node } = path
          const text = node.value.trim()

          if (text && CHINESE_REGEX.test(text)) {
            // 替换为JSX表达式，包含t函数调用
            const i18nCall = t.callExpression(
              t.identifier(functionName),
              [t.stringLiteral(text)]
            )

            path.replaceWith(t.jsxExpressionContainer(i18nCall))
          }
        }
      })

      // 使用 @babel/generator 生成代码
      const output = generate(ast, {
        retainLines: true,
        compact: false,
        jsescOption: {
          minimal: true
        }
      }, source)

      return output.code

    } catch (error) {
      console.error('转换代码失败:', error)
      return source // 发生错误时返回原始代码
    }
  }
}

/**
 * 检查节点是否已经在i18n函数调用中
 * @param path 节点路径
 * @param functionName i18n函数名
 * @returns 是否在函数调用中
 */
function isInI18nCall(path: any, functionName: string): boolean {
  let parent = path.parentPath

  while (parent) {
    if (
      parent.isCallExpression() &&
      ((t.isIdentifier(parent.node.callee) && parent.node.callee.name === functionName) ||
        (t.isMemberExpression(parent.node.callee) &&
         t.isIdentifier(parent.node.callee.property) &&
         parent.node.callee.property.name === functionName))
    ) {
      return true
    }
    parent = parent.parentPath
  }

  return false
}

// 导出单例
export const transform = new Transformer()

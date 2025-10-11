import { Transformer } from '../src/utils/transformer'
import { TransformerOptions } from '../src/types'

describe('Utils Transformer', () => {
  let transformer: Transformer

  beforeEach(() => {
    transformer = new Transformer()
  })

  describe('constructor', () => {
    test('should initialize with default options', () => {
      expect(transformer['options']).toEqual({
        importStatement: "import { useI18n } from 'vue-i18n'",
        functionName: '$t'
      })
    })

    test('should merge custom options with defaults', () => {
      const customOptions: TransformerOptions = {
        importStatement: "import { t } from '@/i18n'",
        functionName: 't'
      }

      transformer = new Transformer(customOptions)

      expect(transformer['options']).toEqual({
        importStatement: "import { t } from '@/i18n'",
        functionName: 't'
      })
    })
  })

  describe('transform', () => {
    const translations = {
      '你好': { en: 'Hello', 'zh-TW': '你好' },
      '世界': { en: 'World', 'zh-TW': '世界' },
      '按钮': { en: 'Button', 'zh-TW': '按鈕' }
    }

    test('should transform Chinese strings in JavaScript', () => {
      const source = `
        const greeting = '你好';
        const world = "世界";
        console.log('测试输出');
      `

      const result = transformer.transform(source, {
        '你好': translations['你好'],
        '世界': translations['世界']
      })

      expect(result).toContain('$t("你好")')
      expect(result).toContain('$t("世界")')
    })

    test('should add import statement when needed', () => {
      const source = `
        const message = '你好';
      `

      const result = transformer.transform(source, translations)

      expect(result).toContain("import { useI18n } from 'vue-i18n'")
      expect(result).toContain('$t("你好")')
    })

    test('should not add import statement when already exists', () => {
      const source = `
        import { useI18n } from 'vue-i18n';
        const message = '你好';
      `

      const result = transformer.transform(source, translations)

      // Should only appear once (the existing import)
      const importMatches = result.match(/import.*vue-i18n/g)
      expect(importMatches).toHaveLength(1)
    })

    test('should use custom import statement and function name', () => {
      transformer = new Transformer({
        importStatement: "import { t } from '@/i18n'",
        functionName: 't'
      })

      const source = `const message = '你好';`

      const result = transformer.transform(source, translations)

      expect(result).toContain("import { t } from '@/i18n'")
      expect(result).toContain('t("你好")')
    })

    test('should handle JSX attributes', () => {
      const source = `
        function Component() {
          return <button title="按钮">点击</button>;
        }
      `

      const result = transformer.transform(source, {
        '按钮': translations['按钮'],
        '点击': { en: 'Click', 'zh-TW': '點擊' }
      })

      expect(result).toContain('title={$t("按钮")}')
      expect(result).toContain('{$t("点击")}')
    })

    test('should handle JSX text nodes', () => {
      const source = `
        function App() {
          return (
            <div>
              <h1>你好</h1>
              <p>世界</p>
            </div>
          );
        }
      `

      const result = transformer.transform(source, translations)

      expect(result).toContain('{$t("你好")}')
      expect(result).toContain('{$t("世界")}')
    })

    test('should not transform strings not in translations map', () => {
      const source = `
        const chinese = '中文';
        const english = 'Hello';
      `

      const result = transformer.transform(source, translations)

      // Should not transform unknown Chinese text
      expect(result).toContain("'中文'")
      // Should not transform English text
      expect(result).toContain("'Hello'")
    })

    test('should not transform strings already in i18n calls', () => {
      const source = `
        const alreadyTranslated = $t('你好');
        const newText = '世界';
      `

      const result = transformer.transform(source, translations)

      expect(result).toContain('$t("你好")')
      expect(result).toContain('$t("世界")')
      // Should not double-wrap the already translated text
      expect(result).not.toContain('$t($t("你好"))')
    })

    test('should not transform import statements', () => {
      const source = `
        import { component } from './组件';
        const text = '你好';
      `

      const result = transformer.transform(source, translations)

      expect(result).toContain("from './组件'")
      expect(result).toContain('$t("你好")')
    })

    test('should handle template literals', () => {
      const source = 'const message = `你好，世界`;'

      const result = transformer.transform(source, {
        '你好，世界': { en: 'Hello, World', 'zh-TW': '你好，世界' }
      })

      expect(result).toContain('$t("你好，世界")')
    })

    test('should handle object properties', () => {
      const source = `
        const obj = {
          title: '你好',
          description: '世界'
        };
      `

      const result = transformer.transform(source, translations)

      expect(result).toContain('title: $t("你好")')
      expect(result).toContain('description: $t("世界")')
    })

    test('should handle function parameters and return values', () => {
      const source = `
        function greet() {
          return '你好';
        }
        
        function log(message = '世界') {
          console.log(message);
        }
      `

      const result = transformer.transform(source, translations)

      expect(result).toContain('return $t("你好")')
      expect(result).toContain('message = $t("世界")')
    })

    test('should handle syntax errors gracefully', () => {
      const invalidSource = `
        const text = '未闭合的字符串
        function test() {
          return '你好';
        }
      `

      const result = transformer.transform(invalidSource, translations)

      // Should return original source on error
      expect(result).toBe(invalidSource)
    })

    test('should handle complex nested structures', () => {
      const source = `
        const config = {
          menus: [
            { name: '你好', children: [{ title: '世界' }] },
            { name: 'English', children: [] }
          ],
          messages: {
            success: '成功',
            error: 'Error'
          }
        };
      `

      const result = transformer.transform(source, {
        ...translations,
        '成功': { en: 'Success', 'zh-TW': '成功' }
      })

      expect(result).toContain('name: $t("你好")')
      expect(result).toContain('title: $t("世界")')
      expect(result).toContain('success: $t("成功")')
      expect(result).toContain("name: 'English'") // Should not transform English
      expect(result).toContain("error: 'Error'") // Should not transform unknown English
    })

    test('should handle Vue component structure', () => {
      const source = `
        export default {
          name: 'TestComponent',
          data() {
            return {
              title: '你好',
              message: '世界'
            }
          },
          methods: {
            showAlert() {
              alert('提示信息');
            }
          }
        }
      `

      const result = transformer.transform(source, {
        ...translations,
        '提示信息': { en: 'Alert message', 'zh-TW': '提示信息' }
      })

      expect(result).toContain('title: $t("你好")')
      expect(result).toContain('message: $t("世界")')
      expect(result).toContain('alert($t("提示信息"))')
    })

    test('should handle edge cases with whitespace and special characters', () => {
      const source = `
        const text1 = '  你好  ';
        const text2 = '世界\\n换行';
        const text3 = '特殊字符: !@#$%^&*()';
      `

      const result = transformer.transform(source, {
        '  你好  ': { en: '  Hello  ', 'zh-TW': '  你好  ' },
        '世界\\n换行': { en: 'World\\nNewline', 'zh-TW': '世界\\n換行' },
        '特殊字符: !@#$%^&*()': { en: 'Special chars: !@#$%^&*()', 'zh-TW': '特殊字符: !@#$%^&*()' }
      })

      expect(result).toContain('$t("  你好  ")')
      expect(result).toContain('$t("世界\\n换行")')
      expect(result).toContain('$t("特殊字符: !@#$%^&*()")')
    })
  })

  describe('error handling', () => {
    test('should handle empty source code', () => {
      const result = transformer.transform('', {})
      expect(result).toBe('')
    })

    test('should handle empty translations object', () => {
      const source = `const text = '你好';`
      const result = transformer.transform(source, {})
      
      // Should not transform without translations
      expect(result).toContain("'你好'")
      expect(result).not.toContain('$t(')
    })

    test('should handle malformed translations object', () => {
      const source = `const text = '你好';`
      const result = transformer.transform(source, {
        '你好': null as any
      })

      // Should handle gracefully
      expect(result).toContain("'你好'")
    })
  })
})
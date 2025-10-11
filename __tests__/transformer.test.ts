import { transform } from '../src/transformer'

describe('Transformer', () => {
  describe('transformJsFileToI18n', () => {
    test('should transform Chinese strings in JavaScript', () => {
      const source = `
        const greeting = '你好，世界';
        const message = "这是一个测试";
        console.log('输出消息');
      `

      const result = transform.transformJsFileToI18n(source)

      expect(result).toContain('$t("你好，世界")')
      expect(result).toContain('$t("这是一个测试")')
      expect(result).toContain('$t("输出消息")')
    })

    test('should use custom function name', () => {
      const source = `const text = '中文内容';`
      
      const result = transform.transformJsFileToI18n(source, { functionName: 't' })
      
      expect(result).toContain('t("中文内容")')
      expect(result).not.toContain('$t("中文内容")')
    })

    test('should not transform non-Chinese strings', () => {
      const source = `
        const englishText = 'Hello World';
        const number = '123';
        const empty = '';
      `

      const result = transform.transformJsFileToI18n(source)

      expect(result).toContain("'Hello World'")
      expect(result).toContain("'123'")
      expect(result).toContain("''")
      expect(result).not.toContain('$t(')
    })

    test('should not transform strings already in i18n calls', () => {
      const source = `
        const alreadyTranslated = $t('已翻译');
        const newText = '新文本';
      `

      const result = transform.transformJsFileToI18n(source)

      // Should keep the already translated text as is
      expect(result).toContain('$t("已翻译")')
      // Should transform the new text
      expect(result).toContain('$t("新文本")')
    })

    test('should not transform import statements', () => {
      const source = `
        import { component } from './组件';
        const text = '这是文本';
      `

      const result = transform.transformJsFileToI18n(source)

      // Import path should remain unchanged
      expect(result).toContain("from './组件'")
      // But other strings should be transformed
      expect(result).toContain('$t("这是文本")')
    })

    test('should handle JSX attributes', () => {
      const source = `
        function Component() {
          return <div title="标题" className="container">内容</div>;
        }
      `

      const result = transform.transformJsFileToI18n(source)

      expect(result).toContain('title={$t("标题")}')
      expect(result).toContain('{$t("内容")}')
    })

    test('should handle JSX text nodes', () => {
      const source = `
        function App() {
          return (
            <div>
              <h1>欢迎使用</h1>
              <p>这是一个测试应用</p>
            </div>
          );
        }
      `

      const result = transform.transformJsFileToI18n(source)

      expect(result).toContain('{$t("欢迎使用")}')
      expect(result).toContain('{$t("这是一个测试应用")}')
    })

    test('should handle mixed Chinese and English in JSX', () => {
      const source = `
        function Component() {
          return (
            <div>
              <span>Hello</span>
              <span>你好</span>
              <span>123</span>
            </div>
          );
        }
      `

      const result = transform.transformJsFileToI18n(source)

      expect(result).toContain('<span>Hello</span>')
      expect(result).toContain('<span>{$t("你好")}</span>')
      expect(result).toContain('<span>123</span>')
    })

    test('should handle syntax errors gracefully', () => {
      const invalidSource = `
        const text = '未闭合的字符串
        function test() {
          return '中文内容';
        }
      `

      const result = transform.transformJsFileToI18n(invalidSource)

      // Should return original source on error
      expect(result).toBe(invalidSource)
    })
  })

  describe('transformVueFileToI18n', () => {
    test('should transform template text nodes', () => {
      const source = `
        <template>
          <div>
            <h1>页面标题</h1>
            <p>页面内容描述</p>
          </div>
        </template>
        <script>
        export default {
          name: 'TestComponent'
        }
        </script>
      `

      const result = transform.transformVueFileToI18n(source)

      expect(result).toContain('{{ $t("页面标题") }}')
      expect(result).toContain('{{ $t("页面内容描述") }}')
    })

    test('should transform template attributes', () => {
      const source = `
        <template>
          <div>
            <input placeholder="请输入内容" title="输入框提示" />
            <button @click="handleClick">点击按钮</button>
          </div>
        </template>
      `

      const result = transform.transformVueFileToI18n(source)

      expect(result).toContain(':placeholder="$t(\'请输入内容\')"')
      expect(result).toContain(':title="$t(\'输入框提示\')"')
      expect(result).toContain('{{ $t("点击按钮") }}')
    })

    test('should transform v-directive values with Chinese strings', () => {
      const source = `
        <template>
          <div>
            <p v-text="'显示的文本'"></p>
            <div v-html="'HTML内容'"></div>
          </div>
        </template>
      `

      const result = transform.transformVueFileToI18n(source)

      expect(result).toContain('v-text="$t(\'显示的文本\')"')
      expect(result).toContain('v-html="$t(\'HTML内容\')"')
    })

    test('should handle template expressions with Chinese strings', () => {
      const source = `
        <template>
          <div>
            <p>{{ message || '默认消息' }}</p>
            <span>{{ formatText('格式化文本') }}</span>
          </div>
        </template>
      `

      const result = transform.transformVueFileToI18n(source)

      expect(result).toContain('{{ message || $t("默认消息") }}')
      expect(result).toContain('{{ formatText($t("格式化文本")) }}')
    })

    test('should transform script section', () => {
      const source = `
        <template>
          <div>模板内容</div>
        </template>
        <script>
        export default {
          data() {
            return {
              message: '脚本中的消息',
              title: '页面标题'
            }
          },
          methods: {
            showAlert() {
              alert('警告信息');
            }
          }
        }
        </script>
      `

      const result = transform.transformVueFileToI18n(source)

      // Template should be transformed
      expect(result).toContain('{{ $t("模板内容") }}')
      // Script strings should be transformed
      expect(result).toContain('$t("脚本中的消息")')
      expect(result).toContain('$t("页面标题")')
      expect(result).toContain('$t("警告信息")')
    })

    test('should use custom function name in Vue files', () => {
      const source = `
        <template>
          <div>测试内容</div>
        </template>
        <script>
        const message = '消息内容';
        </script>
      `

      const result = transform.transformVueFileToI18n(source, { functionName: 't' })

      expect(result).toContain('{{ t("测试内容") }}')
      expect(result).toContain('t("消息内容")')
    })

    test('should handle Vue files without template or script', () => {
      const source = `
        <style>
        .container {
          color: red;
        }
        </style>
      `

      const result = transform.transformVueFileToI18n(source)

      expect(result).toBe(source) // Should return unchanged
    })

    test('should handle Vue files with only template', () => {
      const source = `
        <template>
          <div>仅模板内容</div>
        </template>
      `

      const result = transform.transformVueFileToI18n(source)

      expect(result).toContain('{{ $t("仅模板内容") }}')
    })

    test('should handle Vue files with only script', () => {
      const source = `
        <script>
        const message = '仅脚本内容';
        </script>
      `

      const result = transform.transformVueFileToI18n(source)

      expect(result).toContain('$t("仅脚本内容")')
    })

    test('should not transform v-directives that are not text/html', () => {
      const source = `
        <template>
          <div>
            <input v-model="form.name" />
            <div v-if="showMessage">{{ '条件显示' }}</div>
            <p v-text="'文本内容'"></p>
          </div>
        </template>
      `

      const result = transform.transformVueFileToI18n(source)

      // v-model should not be transformed
      expect(result).toContain('v-model="form.name"')
      // v-if should not be transformed
      expect(result).toContain('v-if="showMessage"')
      // v-text should be transformed
      expect(result).toContain('v-text="$t(\'文本内容\')"')
      // Template expression should be transformed
      expect(result).toContain('{{ $t("条件显示") }}')
    })

    test('should handle complex Vue template with multiple features', () => {
      const source = `
        <template>
          <div class="container">
            <header>
              <h1 title="页面标题">{{ pageTitle || '默认标题' }}</h1>
              <nav>
                <a href="/home">首页</a>
                <a href="/about">关于我们</a>
              </nav>
            </header>
            <main>
              <form>
                <input v-model="form.name" placeholder="请输入姓名" />
                <button type="submit">提交表单</button>
              </form>
            </main>
            <footer v-text="'版权信息'"></footer>
          </div>
        </template>
        <script>
        export default {
          data() {
            return {
              pageTitle: '我的应用',
              form: {
                name: ''
              }
            }
          },
          methods: {
            onSubmit() {
              if (!this.form.name) {
                this.$message.error('请填写姓名');
                return;
              }
              this.$message.success('提交成功');
            }
          }
        }
        </script>
      `

      const result = transform.transformVueFileToI18n(source)

      // Template transformations
      expect(result).toContain(':title="$t(\'页面标题\')"')
      expect(result).toContain('{{ pageTitle || $t("默认标题") }}')
      expect(result).toContain('{{ $t("首页") }}')
      expect(result).toContain('{{ $t("关于我们") }}')
      expect(result).toContain(':placeholder="$t(\'请输入姓名\')"')
      expect(result).toContain('{{ $t("提交表单") }}')
      expect(result).toContain('v-text="$t(\'版权信息\')"')
      
      // Script transformations
      expect(result).toContain('$t("我的应用")')
      expect(result).toContain('$t("请填写姓名")')
      expect(result).toContain('$t("提交成功")')
    })
  })
})
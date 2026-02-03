/**
 * 正则表达式过滤测试
 * 验证提取器能正确识别并排除正则表达式中的中文字符
 */

import { ChineseExtractor } from '../src/utils/chinese-extractor'

describe('ChineseExtractor - 正则表达式过滤', () => {
  let extractor: ChineseExtractor

  beforeEach(() => {
    extractor = new ChineseExtractor({
      ignoreComments: true
    })
  })

  test('应该排除正则字面量中的中文（车牌号格式）', () => {
    const code = `
      const licenseFormat = '/^(([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z](([0-9]{5}[A-Z])|([A-Z]([A-HJ-NP-Z0-9])[0-9]{4})))|([虚无]([A-Z0-9]{6})))$/';
    `
    const result = extractor.extractFromJsFile(code)
    
    // 不应该提取正则中的中文省份简称
    expect(result).not.toContain('京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领')
    expect(result).not.toContain('虚无')
  })

  test('应该排除包含字符集的正则表达式', () => {
    const code = `
      const pattern = '[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领]';
    `
    const result = extractor.extractFromJsFile(code)
    
    expect(result).not.toContain('京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领')
  })

  test('应该排除复杂的正则表达式字符串', () => {
    const code = `
      const regex = '^(([京津沪渝][A-Z][0-9]{5})|([A-Z挂学警港澳使领]{4}))$';
    `
    const result = extractor.extractFromJsFile(code)
    
    expect(result).not.toContain('京津沪渝')
    expect(result).not.toContain('挂学警港澳使领')
  })

  test('应该提取普通中文字符串', () => {
    const code = `
      const message = '你好世界';
      const title = '欢迎使用';
    `
    const result = extractor.extractFromJsFile(code)
    
    expect(result).toContain('你好世界')
    expect(result).toContain('欢迎使用')
  })

  test('应该区分正则和普通字符串', () => {
    const code = `
      const regex = '/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z]$/';
      const province = '北京市';
      const greeting = '你好';
    `
    const result = extractor.extractFromJsFile(code)
    
    // 正则中的不应该提取
    expect(result).not.toContain('京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领')
    
    // 普通字符串应该提取
    expect(result).toContain('北京市')
    expect(result).toContain('你好')
  })

  test('应该排除包含转义字符的正则模式', () => {
    const code = `
      const pattern = '\\d+年\\d+月\\d+日';
    `
    const result = extractor.extractFromJsFile(code)
    
    // 包含大量转义字符，识别为正则模式
    expect(result).not.toContain('年')
    expect(result).not.toContain('月')
    expect(result).not.toContain('日')
  })

  test('应该排除包含量词的正则模式', () => {
    const code = `
      const pattern = '[京津沪渝]{1,2}[A-Z]{5}';
    `
    const result = extractor.extractFromJsFile(code)
    
    expect(result).not.toContain('京津沪渝')
  })

  test('应该识别 Vue 模板中的正则字符串', () => {
    const vueCode = `
      <template>
        <div>{{ licenseFormat }}</div>
      </template>
      <script>
      export default {
        data() {
          return {
            licenseFormat: '/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z]$/',
            welcome: '欢迎使用'
          }
        }
      }
      </script>
    `
    const result = extractor.extractFromVueFile(vueCode)
    
    // 正则中的省份简称不应该提取
    expect(result).not.toContain('京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领')
    
    // 普通字符串应该提取
    expect(result).toContain('欢迎使用')
  })

  test('应该识别对象属性中的正则模式', () => {
    const code = `
      const config = {
        phoneFormat: '^1\\d{10}$',
        licenseFormat: '/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳使领]$/',
        title: '系统配置'
      }
    `
    const result = extractor.extractFromJsFile(code)
    
    // 正则中的中文不应提取
    expect(result).not.toContain('京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领')
    expect(result).not.toContain('挂学警港澳使领')
    
    // 普通字符串应该提取
    expect(result).toContain('系统配置')
  })

  test('应该处理边界情况：仅包含中文的字符集', () => {
    const code = `
      const pattern1 = '[京津沪渝]';
      const pattern2 = '[a-z中文]';
      const text = '中文文本';
    `
    const result = extractor.extractFromJsFile(code)
    
    // 字符集中的不应该提取
    expect(result).not.toContain('京津沪渝')
    
    // 普通文本应该提取
    expect(result).toContain('中文文本')
  })
})

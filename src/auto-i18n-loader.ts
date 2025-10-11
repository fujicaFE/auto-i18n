/**
 * Auto I18n Webpack Loader
 * 在内存中转换中文文本为 $t() 函数调用
 */

import { Transformer } from './utils/transformer'
import * as path from 'path'
import * as fs from 'fs'

interface LoaderOptions {
  memoryTransformOnly?: boolean
  functionName?: string
  translations?: { [key: string]: { [locale: string]: string } }
  outputPath?: string
}

module.exports = function autoI18nLoader(this: any, source: string) {
  const resourcePath = this.resourcePath || ''
  const fileName = path.basename(resourcePath)
  
  console.log(`AutoI18nLoader: 🔄 Processing ${fileName}`)
  
  // 兼容不同版本的 webpack loader API
  let options: LoaderOptions = {}
  
  try {
    // webpack 5+ 和最新的 loader-utils
    if (this.getOptions) {
      options = this.getOptions() || {}
    } else if (this.query && typeof this.query === 'object') {
      // webpack 4 兼容性
      options = this.query
    } else {
      // 降级方案：使用 loader-utils
      const loaderUtils = require('loader-utils')
      options = loaderUtils.getOptions(this) || {}
    }
  } catch (error) {
    console.warn('AutoI18nLoader: Could not get options, using defaults:', error.message)
    options = { memoryTransformOnly: true, functionName: '$t' }
  }
  
  console.log(`AutoI18nLoader: Processing ${path.basename(resourcePath)} with options:`, options)
  
  console.log(`AutoI18nLoader: Processing ${resourcePath}`)
  console.log(`AutoI18nLoader: memoryTransformOnly = ${options.memoryTransformOnly}`)
  
  // 如果不需要内存转换，直接返回原始代码
  if (!options.memoryTransformOnly) {
    console.log(`AutoI18nLoader: Skip transform (memoryTransformOnly=false)`)
    return source
  }

  // 只处理 .vue 和 .js/.ts 文件，忽略 node_modules
  if (resourcePath.includes('node_modules')) {
    console.log(`AutoI18nLoader: Skip node_modules file`)
    return source
  }

  const ext = path.extname(resourcePath).toLowerCase()
  if (!['.vue', '.js', '.ts'].includes(ext)) {
    console.log(`AutoI18nLoader: Skip unsupported file type: ${ext}`)
    return source
  }

  console.log(`AutoI18nLoader: Attempting to transform ${path.basename(resourcePath)}`)
  
  // 如果没有传递翻译映射，尝试从文件系统加载
  let translations = options.translations || {}
  if (!translations || Object.keys(translations).length === 0) {
    translations = loadTranslationsFromFiles(options.outputPath)
  }
  
  console.log(`AutoI18nLoader: Found ${Object.keys(translations).length} known Chinese texts`)
  
  try {
    const transformer = new Transformer({
      functionName: options.functionName || '$t'
    })
    
    // 使用 transformer 转换代码
    const transformedCode = transformer.transform(source, translations || {})
    
    // 如果有转换，记录日志
    if (transformedCode !== source) {
      console.log(`AutoI18nLoader: ✅ Successfully transformed ${path.basename(resourcePath)}`)
      // 显示部分转换结果
      const firstLine = transformedCode.split('\n')[0]
      console.log(`AutoI18nLoader: First line after transform: ${firstLine}`)
    } else {
      console.log(`AutoI18nLoader: ❌ No changes made to ${path.basename(resourcePath)}`)
    }
    
    return transformedCode
  } catch (error) {
    console.error(`AutoI18nLoader: Transform error in ${resourcePath}:`, error)
    return source
  }
}

module.exports.raw = false

/**
 * 从文件系统加载翻译映射
 */
function loadTranslationsFromFiles(outputPath?: string): { [key: string]: { [locale: string]: string } } {
  const translations: { [key: string]: { [locale: string]: string } } = {}
  
  // 默认的翻译文件路径
  const defaultPaths = [
    './src/locales',
    './locales',
    '../../test-project/src/locales' // 对于当前的测试项目结构
  ]
  
  const searchPaths = outputPath ? [outputPath, ...defaultPaths] : defaultPaths
  
  for (const searchPath of searchPaths) {
    try {
      const localesDir = path.resolve(searchPath)
      if (fs.existsSync(localesDir)) {
        console.log(`AutoI18nLoader: Loading translations from ${localesDir}`)
        
        // 读取所有 .json 文件
        const files = fs.readdirSync(localesDir).filter(file => file.endsWith('.json'))
        
        for (const file of files) {
          const locale = path.basename(file, '.json')
          const filePath = path.join(localesDir, file)
          
          try {
            const content = fs.readFileSync(filePath, 'utf-8')
            const localeTranslations = JSON.parse(content)
            
            // 转换格式：从 { key: translation } 到 { key: { locale: translation } }
            for (const [key, translation] of Object.entries(localeTranslations)) {
              if (!translations[key]) {
                translations[key] = {}
              }
              translations[key][locale] = translation as string
            }
          } catch (error) {
            console.warn(`AutoI18nLoader: Failed to load ${filePath}:`, error.message)
          }
        }
        
        break // 找到第一个存在的目录就停止搜索
      }
    } catch (error) {
      console.warn(`AutoI18nLoader: Failed to access ${searchPath}:`, error.message)
    }
  }
  
  return translations
}
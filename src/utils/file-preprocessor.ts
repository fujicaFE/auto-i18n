/**
 * 文件预处理器
 * 负责Vue文件的直接预处理，直接修改源文件
 */

import path from 'path'
import { ChineseExtractor } from './chinese-extractor'

export interface TranslationData {
  [key: string]: { [locale: string]: string }
}

export class FilePreprocessor {
  private chineseExtractor: ChineseExtractor
  private processedFiles: Map<string, string> = new Map() // 文件路径 -> 文件内容哈希
  private codeStyle?: { semicolons?: boolean; quotes?: 'single' | 'double' }

  constructor(chineseExtractor: ChineseExtractor, codeStyle?: { semicolons?: boolean; quotes?: 'single' | 'double' }) {
    this.chineseExtractor = chineseExtractor
    this.codeStyle = codeStyle
  }

  /**
   * 直接处理Vue文件，修改源文件
   */
  async processVueFilesDirectly(outputPath: string): Promise<void> {
    try {
      const glob = require('glob')
      const fs = require('fs')
      const crypto = require('crypto')
      
      // 查找所有Vue文件
      const vueFiles = glob.sync('src/**/*.vue', {
        cwd: process.cwd(),
        ignore: ['node_modules/**', 'dist/**', 'build/**']
      })
      
      console.log(`🔍 AutoI18nPlugin: 发现 ${vueFiles.length} 个Vue文件需要处理`)
      
      // 加载翻译数据
      const translations = this.loadTranslationsFromMemory(outputPath)
      
      let processedCount = 0
      
      for (const relativeFilePath of vueFiles) {
        const absoluteFilePath = path.resolve(process.cwd(), relativeFilePath)
        
        try {
          // 读取原始文件内容
          const originalContent = fs.readFileSync(absoluteFilePath, 'utf-8')
          
          // 计算文件内容哈希
          const contentHash = crypto.createHash('md5').update(originalContent).digest('hex')
          
          // 检查是否已经处理过相同内容的文件
          if (this.processedFiles.has(absoluteFilePath) && 
              this.processedFiles.get(absoluteFilePath) === contentHash) {
            console.log(`⏭️ AutoI18nPlugin: 跳过已处理文件 - ${relativeFilePath}`)
            continue
          }
          
          // 检查是否包含中文
          const chineseRegex = /[\u4e00-\u9fff]/
          if (chineseRegex.test(originalContent)) {
            console.log(`📝 AutoI18nPlugin: 处理Vue文件 - ${relativeFilePath}`)
            
            // 转换内容
            const transformedContent = this.transformVueFileContent(originalContent, translations)
            
            if (transformedContent !== originalContent) {
              // 只在内容真正改变时才写入文件
              const transformedHash = crypto.createHash('md5').update(transformedContent).digest('hex')
              
              // 避免写入相同内容
              if (contentHash !== transformedHash) {
                fs.writeFileSync(absoluteFilePath, transformedContent, 'utf-8')
                console.log(`✅ AutoI18nPlugin: 已更新文件 - ${relativeFilePath}`)
                processedCount++
                
                // 记录处理过的文件
                this.processedFiles.set(absoluteFilePath, transformedHash)
              } else {
                console.log(`ℹ️ AutoI18nPlugin: 内容无变化 - ${relativeFilePath}`)
              }
            } else {
              console.log(`ℹ️ AutoI18nPlugin: 无需转换 - ${relativeFilePath}`)
              this.processedFiles.set(absoluteFilePath, contentHash)
            }
          } else {
            console.log(`⚪ AutoI18nPlugin: 无中文内容 - ${relativeFilePath}`)
            this.processedFiles.set(absoluteFilePath, contentHash)
          }
        } catch (error) {
          console.error(`❌ AutoI18nPlugin: 处理文件失败 ${relativeFilePath}:`, error)
        }
      }
      
      console.log(`🎯 AutoI18nPlugin: 文件处理完成，实际更新了 ${processedCount} 个文件`)
    } catch (error) {
      console.error('❌ AutoI18nPlugin: processVueFilesDirectly 失败:', error)
    }
  }

  /**
   * 转换Vue文件内容，将中文文本替换为$t()调用
   * 使用专业的Transformer来处理JavaScript和模板部分
   */
  transformVueFileContent(content: string, translations: TranslationData): string {
    try {
      // 使用我们现有的chineseExtractor来提取中文文本
      const chineseTexts = this.chineseExtractor.extractFromVueFile(content)
      
      if (chineseTexts.length === 0) {
        return content // 如果没有中文文本，直接返回原内容
      }
      
      console.log(`   发现 ${chineseTexts.length} 个中文文本`)
      
      // 使用专业的Transformer来处理Vue文件
      const { Transformer } = require('./transformer')
      const transformer = new Transformer({
        functionName: '$t',
        semicolons: this.codeStyle?.semicolons,
        quotes: this.codeStyle?.quotes
      })
      
      // 转换整个Vue文件（包括模板和脚本部分）
      const transformedContent = transformer.transform(content, translations)
      
      // 如果转换后有变化，记录转换的文本
      if (transformedContent !== content) {
        for (const text of chineseTexts) {
          console.log(`   替换: "${text}" -> $t('${text}')`)
        }
      }
      
      return transformedContent
    } catch (error) {
      console.error('transformVueFileContent error:', error)
      return content // 出错时返回原内容
    }
  }

  /**
   * 处理render函数
   */
  processRenderFunction(source: string, resourcePath: string, translations: any): void {
    console.log(`🔄 AutoI18nPlugin: 开始处理render函数中的中文文本`)
    
    try {
      const { Transformer } = require('./transformer')
      const transformer = new Transformer({
        functionName: '$t'
      })
      
      // 检查render函数中是否包含中文
      const chineseRegex = /[\u4e00-\u9fff]/
      if (chineseRegex.test(source)) {
        console.log(`🎨 AutoI18nPlugin: render函数中发现中文文本，开始转换...`)
        
        // 调用transformer处理
        const transformedCode = transformer.transform(source, translations)
        
        if (transformedCode !== source) {
          console.log(`✅ AutoI18nPlugin: render函数转换完成！`)
        } else {
          console.log(`ℹ️ AutoI18nPlugin: render函数无需转换`)
        }
      } else {
        console.log(`ℹ️ AutoI18nPlugin: render函数中未发现中文文本`)
      }
    } catch (error) {
      console.error(`❌ AutoI18nPlugin: 处理render函数时出错:`, error)
    }
  }

  /**
   * 从文件系统加载翻译数据
   */
  private loadTranslationsFromMemory(outputPath: string): TranslationData {
    const translations: TranslationData = {}
    
    try {
      const fs = require('fs')
      const localesDir = path.resolve(outputPath)
      
      if (!fs.existsSync(localesDir)) {
        return translations
      }

      const files = fs.readdirSync(localesDir).filter((file: string) => file.endsWith('.json'))
      
      for (const file of files) {
        const locale = path.basename(file, '.json')
        const filePath = path.join(localesDir, file)
        
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          const localeTranslations = JSON.parse(content)
          
          for (const [key, translation] of Object.entries(localeTranslations)) {
            if (!translations[key]) {
              translations[key] = {}
            }
            translations[key][locale] = translation as string
          }
        } catch (error) {
          console.warn('AutoI18nPlugin: Failed to load', filePath)
        }
      }
    } catch (error) {
      console.warn('AutoI18nPlugin: Failed to load translations:', error.message)
    }

    return translations
  }

  /**
   * 重置处理状态（用于开发模式）
   */
  resetProcessedFiles(): void {
    this.processedFiles.clear()
    console.log('🔄 AutoI18nPlugin: 重置文件处理状态')
  }

  /**
   * 检查文件是否已处理
   */
  isFileProcessed(filePath: string, content: string): boolean {
    const crypto = require('crypto')
    const contentHash = crypto.createHash('md5').update(content).digest('hex')
    return this.processedFiles.has(filePath) && 
           this.processedFiles.get(filePath) === contentHash
  }
}
import path from 'path'
import { ChineseExtractor } from './utils/chinese-extractor'
import { TranslationService } from './utils/translation-service'
import { LocaleFileManager } from './utils/locale-file-manager'
import { RenderDetector } from './utils/render-detector'
import { CodeAnalyzer } from './utils/code-analyzer'
import { FilePreprocessor } from './utils/file-preprocessor'
import { AutoI18nPluginOptions, Translation } from './types'

// 内置 RawSource 实现，避免依赖 webpack-sources
class SimpleRawSource {
  _source: string

  constructor(source: string) {
    this._source = source
  }

  source() {
    return this._source
  }

  size() {
    return this._source.length
  }
}

class AutoI18nPlugin {
  options: AutoI18nPluginOptions
  translationService: TranslationService
  localeFileManager: LocaleFileManager
  chineseExtractor: ChineseExtractor
  renderDetector: RenderDetector
  codeAnalyzer: CodeAnalyzer
  filePreprocessor: FilePreprocessor
  private processedTexts: Set<string> = new Set()
  private isDevMode: boolean = false
  private compilationCount: number = 0
  private processedFiles: Set<string> = new Set()
  private isProcessing: boolean = false

  constructor(options: AutoI18nPluginOptions) {
    this.options = {
      outputPath: './src/locales',
      presets: {},
      exclude: [],
      ignoreComments: true,
      apiKey: '',
      apiProvider: 'preset',
      sourceLanguage: 'zh',
      targetLanguages: ['en', 'zh-TW'],
      enableProductionAnalysis: false, // 默认不启用产物分析
      ...options
    }

    // 确保targetLanguages包含sourceLanguage
    const sourceLanguage = this.options.sourceLanguage || 'zh'
    const targetLanguages = this.options.targetLanguages || ['en', 'zh-TW']
    if (!targetLanguages.includes(sourceLanguage)) {
      targetLanguages.unshift(sourceLanguage)
    }

    this.translationService = new TranslationService({
      apiKey: this.options.apiKey,
      apiProvider: this.options.apiProvider,
      sourceLanguage: sourceLanguage,
      targetLanguages: targetLanguages,
      presets: this.options.presets || {}
    })

    this.localeFileManager = new LocaleFileManager(
      this.options.outputPath || './src/locales',
      targetLanguages,
      sourceLanguage
    )
    this.chineseExtractor = new ChineseExtractor({
      ignoreComments: this.options.ignoreComments
    })
    
    // 初始化新的工具类
    this.renderDetector = new RenderDetector()
    this.codeAnalyzer = new CodeAnalyzer()
    this.filePreprocessor = new FilePreprocessor(this.chineseExtractor, this.options.codeStyle)
  }

  apply(compiler: any) {
    // 检测是否为开发模式
    this.isDevMode = compiler.options.mode === 'development' || compiler.options.watch || !!compiler.watchMode

    // 兼容 webpack 4.x 和 5.x
    let RawSource: any

    try {
      // webpack 5.x
      const { webpack } = compiler
      if (webpack && webpack.sources) {
        RawSource = webpack.sources.RawSource
      } else {
        // webpack 4.x
        RawSource = require('webpack-sources').RawSource
      }
    } catch (error) {
      // 降级方案，使用我们自己的 SimpleRawSource 实现
      RawSource = SimpleRawSource
      console.warn('AutoI18nPlugin: Could not find webpack-sources. Using fallback RawSource implementation.')
    }

    // 在编译开始前处理源文件，而不是处理编译后的资产
    compiler.hooks.compilation.tap('AutoI18nPlugin', (compilation: any) => {

      // 使用 buildModule 钩子处理每个模块
      compilation.hooks.buildModule.tap('AutoI18nPlugin', (module: any) => {
        // 只处理用户源文件，忽略 node_modules
        if (module.resource && !module.resource.includes('node_modules')) {
          const resourcePath = module.resource
          
          // 避免重复处理相同文件
          if (this.processedFiles.has(resourcePath)) {
            return
          }
          
          const ext = path.extname(resourcePath).toLowerCase()
          
          // 只处理 .vue 和 .js/.ts 文件
          if (ext === '.vue' || ext === '.js' || ext === '.ts') {
            this.processSourceFile(resourcePath)
            this.processedFiles.add(resourcePath)
          }
        }
      })

      // 在所有模块处理完成后进行翻译和保存
      compilation.hooks.finishModules.tap('AutoI18nPlugin', (modules: any) => {
        // 异步处理，但不阻塞编译
        this.processCollectedTexts().catch(error => {
          console.error('AutoI18nPlugin: Error processing collected texts:', error)
        })
      })
    })

    // 🔥 新增：在编译开始前直接预处理Vue文件
    if (this.options.transformCode) {
      compiler.hooks.beforeCompile.tap('AutoI18nPlugin', (params: any) => {
        // 防止重复处理和循环调用
        if (this.isProcessing) {
          console.log('⚠️ AutoI18nPlugin: 已在处理中，跳过本次预处理')
          return
        }

        // 只在第一次编译时处理
        if (this.compilationCount > 0) {
          console.log('ℹ️ AutoI18nPlugin: 非首次编译，跳过Vue文件预处理')
          return
        }

        console.log('🚀 AutoI18nPlugin: beforeCompile - 开始直接预处理Vue文件')
        
        this.isProcessing = true
        
        // 异步处理，但不阻塞编译
        this.filePreprocessor.processVueFilesDirectly(this.options.outputPath)
          .then(() => {
            console.log('✅ AutoI18nPlugin: Vue文件直接预处理完成')
          })
          .catch(error => {
            console.error('❌ AutoI18nPlugin: Vue文件预处理失败:', error)
          })
          .finally(() => {
            this.isProcessing = false
          })
      })
    }

    // 在开发模式下，当编译完成时可以选择性保存翻译文件
    if (this.isDevMode) {
      compiler.hooks.done.tap('AutoI18nPlugin', () => {
        this.compilationCount++
        
        // 只在第一次编译完成时处理，避免循环
        if (this.compilationCount === 1 && this.processedTexts.size > 0) {
          console.log(`AutoI18nPlugin: Dev mode - cached ${this.processedTexts.size} translations for potential save`)
        }
        
        // 每次编译完成后重置处理状态（除了第一次）
        if (this.compilationCount > 1) {
          this.processedFiles.clear()
          console.log('🔄 AutoI18nPlugin: 重置文件处理状态以准备下次编译')
        }
      })
    }

    // 使用emit钩子来捕获最终生成的代码，包括Vue的render函数
    // 只有在启用生产环境分析时才执行
    if (this.options.enableProductionAnalysis) {
      compiler.hooks.emit.tap('AutoI18nPlugin', (compilation: any) => {
        console.log('🎯 AutoI18nPlugin: emit钩子 - 开始分析最终生成的资产')
        
        const translations = this.loadTranslationsFromMemory();
        
        // 遍历所有生成的资产
        for (const [filename, asset] of Object.entries(compilation.assets)) {
          // 只处理JavaScript文件
          if (filename.endsWith('.js')) {
            console.log(`📄 AutoI18nPlugin: 分析JavaScript资产 - ${filename}`)
            
            // 获取资产的源代码
            const source = (asset as any).source();
            
            if (typeof source === 'string') {
              // 检查是否包含Vue render函数的特征
              const renderResult = this.renderDetector.checkForRenderInEmittedCode(source);
              
              if (renderResult.hasRenderFunction) {
                console.log(`🎨 AutoI18nPlugin: 在 ${filename} 中发现render函数！`)
                
                // 检查render函数中是否包含中文
                const chineseRegex = /[\u4e00-\u9fff]/;
                if (chineseRegex.test(source)) {
                  console.log(`🈚 AutoI18nPlugin: ${filename} 中的render函数包含中文文本！`)
                  
                  // 在这里我们可以进行处理
                  this.codeAnalyzer.processRenderFunctionInEmit(source, filename, translations);
                }
              }
            }
          }
        }
        
        console.log('✅ AutoI18nPlugin: emit钩子分析完成')
      });
    } else {
      console.log('ℹ️ AutoI18nPlugin: 生产环境分析已禁用 (enableProductionAnalysis: false)')
    }
  }

  private async processSourceFile(filePath: string) {
    try {
      const fs = require('fs')
      const source = fs.readFileSync(filePath, 'utf-8')
      const ext = path.extname(filePath).toLowerCase()

      // 提取中文文本
      const chineseTexts = ext === '.vue'
        ? this.chineseExtractor.extractFromVueFile(source)
        : this.chineseExtractor.extractFromJsFile(source)

      // 添加到集合中
      chineseTexts.forEach((text: string) => this.processedTexts.add(text))
    } catch (error) {
      console.error(`AutoI18nPlugin: Error processing source file ${filePath}`, error)
    }
  }

  private async processCollectedTexts() {
    if (this.processedTexts.size === 0) {
      console.log('AutoI18nPlugin: No Chinese texts found in source files')
      return
    }

    console.log('AutoI18nPlugin: Processing source files...')

    // 读取现有的翻译文件
    await this.localeFileManager.loadTranslations()

    // 翻译新的中文文本 - 过滤掉已处理的文本避免重复处理
    const allTexts = Array.from(this.processedTexts)
    const newTexts = allTexts.filter(
      text => !this.localeFileManager.hasTranslation(text)
    )

    if (newTexts.length > 0) {
      console.log(`AutoI18nPlugin: Found ${newTexts.length} new Chinese texts to translate`)

      try {
        const translations = await this.translationService.translateBatch(newTexts)

        // 更新翻译文件
        this.localeFileManager.addTranslations(translations)

        // 在开发模式下，只保存第一次编译的结果，避免无限循环
        this.compilationCount++
        
        if (!this.isDevMode || this.compilationCount === 1) {
          // 将翻译保存到文件
          const allTranslationsArray: Translation[] = []
          for (const text of allTexts) {
            const translationRecord = await this.translationService.translateBatch([text])
            if (translationRecord.length > 0) {
              allTranslationsArray.push(translationRecord[0])
            }
          }
          this.localeFileManager.saveTranslations(allTranslationsArray)
          console.log(`AutoI18nPlugin: Translations saved to ${this.options.outputPath}`)
        } else {
          console.log('AutoI18nPlugin: Dev mode - translations cached but not saved to avoid rebuild loop')
        }
      } catch (error) {
        console.error('AutoI18nPlugin: Translation error', error)
      }
    } else {
      console.log('AutoI18nPlugin: No new Chinese texts found in source files')
    }
  }

  private loadTranslationsFromMemory(): { [key: string]: { [locale: string]: string } } {
    const translations: { [key: string]: { [locale: string]: string } } = {}
    
    try {
      const fs = require('fs')
      const localesDir = path.resolve(this.options.outputPath)
      
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

}

// CommonJS 模块导出，webpack插件需要这种格式
module.exports = AutoI18nPlugin

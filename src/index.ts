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
  private translationsProcessed: boolean = false
  private logLevel: 'silent' | 'minimal' | 'verbose'
  private logThrottleMs: number
  private metrics: {
    scannedVue: number;
    updatedVue: number;
    skippedVue: number;
    chineseVue: number;
    newKeys: number;
  } = { scannedVue: 0, updatedVue: 0, skippedVue: 0, chineseVue: 0, newKeys: 0 }

  constructor(options: AutoI18nPluginOptions) {
    this.options = {
      outputPath: './src/locales',
      presets: {},
      exclude: [],
      ignoreComments: true,
      debugExtraction: false,
      apiKey: '',
      apiProvider: 'preset',
      sourceLanguage: 'zh',
      targetLanguages: ['en', 'zh-TW'],
      enableProductionAnalysis: false, // 默认不启用产物分析
      skipExistingTranslation: true,
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
      ignoreComments: this.options.ignoreComments,
      debugExtraction: (this.options as any).debugExtraction
    })
    
    // 初始化新的工具类
    this.renderDetector = new RenderDetector()
    this.codeAnalyzer = new CodeAnalyzer()
    this.logLevel = this.options.logLevel || 'verbose'
  // summaryOnly: 在非 verbose 模式下，只输出最终汇总
    const summaryOnly = this.logLevel !== 'verbose'
    this.filePreprocessor = new FilePreprocessor(
      this.chineseExtractor,
      this.options.codeStyle,
      this.logLevel,
      this.logLevel === 'verbose', // perFileLog 仅在 verbose 下开启
      summaryOnly
    )
    this.logThrottleMs = this.options.logThrottleMs ?? 5000
  }

  private log(level: 'verbose' | 'minimal', domain: string, ...args: any[]) {
    if (this.logLevel === 'silent') return
    if (this.logLevel === 'minimal' && level === 'verbose') return
    const prefix = `[auto-i18n:${domain}]`
    console.log(prefix, ...args)
  }

  private logOnceFlag: Set<string> = new Set()
  private logOnce(key: string, level: 'verbose' | 'minimal', domain: string, ...args: any[]) {
    if (this.logOnceFlag.has(key)) return
    this.logOnceFlag.add(key)
    this.log(level, domain, ...args)
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
      // 每次编译都重新收集（processedFiles 仅用于当前编译周期去重）
      compilation.hooks.buildModule.tap('AutoI18nPlugin', (module: any) => {
        if (!module.resource || module.resource.includes('node_modules')) return
        const resourcePath = module.resource
        const ext = path.extname(resourcePath).toLowerCase()
        if (!['.vue','.js','.ts'].includes(ext)) return
        if (this.processedFiles.has(resourcePath)) return
        this.processSourceFile(resourcePath)
        this.processedFiles.add(resourcePath)
      })

      compilation.hooks.finishModules.tap('AutoI18nPlugin', async () => {
        try {
          await this.processCollectedTexts()
          // 翻译完成后统一执行包裹（源码重写）
          await this.transformAllSourceFiles()
          // 二次扫描：捕获第一次未进入 Map 的已包裹或混合中文（例如 你好cc）
          // await this.rescanForMissingKeys()
        } catch (e) {
          console.error('[auto-i18n] finishModules error', e)
        }
      })
    })

    // 🔥 新增：在编译开始前直接预处理Vue文件
    // 移除旧的仅首次 beforeCompile 预处理逻辑；统一在 finishModules 后处理

    // 在开发模式下，当编译完成时可以选择性保存翻译文件
    compiler.hooks.done.tap('AutoI18nPlugin', () => {
      this.compilationCount++
      this.processedFiles.clear() // 为下一轮编译重新收集
      this.translationsProcessed = false // 允许增量新增翻译
      this.outputSummary()
    })

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
      this.log('minimal', 'analysis', '生产环境分析已禁用 (enableProductionAnalysis: false)')
    }
  }

  private async transformAllSourceFiles() {
    if (!this.options.transformCode) return
    // 加载最新翻译映射
    const translationsMap = this.loadTranslationsFromMemory()
    const fs = require('fs')
    const glob = require('glob')
    const root = process.cwd()
    const files: string[] = glob.sync('**/*.{vue,js,ts}', { cwd: root, absolute: true, ignore: ['**/node_modules/**'] })
    if (!files.length) return
    const { Transformer } = require('./utils/transformer')
    const transformer = new Transformer({
      functionName: '$t',
      globalFunctionName: 'i18n.t',
      quotes: this.options.codeStyle?.quotes || 'single',
      semicolons: false
    })
    const chineseRegex = /[\u4e00-\u9fff]/
    for (const file of files) {
      try {
        const ext = path.extname(file).toLowerCase()
        const source = fs.readFileSync(file, 'utf-8')
        const base = path.basename(file)
        if (['vue.config.js','webpack.config.js','jest.config.js','tsconfig.json'].includes(base)) continue
        if (!chineseRegex.test(source) && !/\b\$t\(|i18n\.t\(/.test(source)) continue
        const transformed = transformer.transform(source, translationsMap)
        if (transformed !== source) fs.writeFileSync(file, transformed, 'utf-8')
      } catch (e) {
        console.warn('[auto-i18n] transform file failed', file, e.message)
      }
    }
  }

  private async rescanForMissingKeys() {
    const fs = require('fs')
    const glob = require('glob')
    const root = process.cwd()
    const files: string[] = glob.sync('**/*.{vue,js,ts}', { cwd: root, absolute: true, ignore: ['**/node_modules/**'] })
    if (!files.length) return
    await this.localeFileManager.loadTranslations()
    const existingSet = new Set<string>()
    const existingTranslations = this.localeFileManager.getTranslations()
    for (const tr of existingTranslations) existingSet.add(tr.source)
    const newlyFound: string[] = []
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        const chineseTexts = content.includes('<template>') && content.includes('</template>')
          ? this.chineseExtractor.extractFromVueFile(content)
          : this.chineseExtractor.extractFromJsFile(content)
        for (const txt of chineseTexts) {
          if (!existingSet.has(txt)) {
            newlyFound.push(txt)
            existingSet.add(txt)
          }
        }
      } catch {}
    }
    if (!newlyFound.length) return
    this.log('minimal', 'rescan', `found missing chinese keys=${newlyFound.length}`)
    try {
      const translations = await this.translationService.translateBatch(newlyFound)
      this.localeFileManager.addTranslations(translations)
      this.localeFileManager.saveTranslations(translations)
      this.log('minimal', 'rescan', 'missing keys saved')
    } catch (e) {
      console.error('[auto-i18n] rescan translate error', e)
    }
  }

  private async processSourceFile(filePath: string) {
    try {
      const fs = require('fs')
      // 处理可能包含 loader query 的资源路径 (例如 Component.vue?vue&type=script)
      if (filePath.includes('.vue?')) {
        const purePath = filePath.split('?')[0]
        if (fs.existsSync(purePath)) filePath = purePath
      }
      const source = fs.readFileSync(filePath, 'utf-8')
      const ext = path.extname(filePath).toLowerCase()

      // 提取中文文本
      const chineseTexts = ext === '.vue'
        ? this.chineseExtractor.extractFromVueFile(source)
        : this.chineseExtractor.extractFromJsFile(source)

      // 添加到集合中
      chineseTexts.forEach((text: string) => this.processedTexts.add(text))
      if (ext === '.vue') {
        this.metrics.scannedVue++
        if (chineseTexts.length) this.metrics.chineseVue++
      }
    } catch (error) {
      console.error(`AutoI18nPlugin: Error processing source file ${filePath}`, error)
    }
  }

  private async processCollectedTexts() {
    if (this.translationsProcessed) return
    if (this.processedTexts.size === 0) return

    await this.localeFileManager.loadTranslations()
    const allTexts = Array.from(this.processedTexts)

    const newTexts = allTexts.filter(text => !this.localeFileManager.hasTranslation(text))
    let newlyTranslated: Translation[] = []

    if (newTexts.length > 0) {
  this.log('minimal', 'translate', `new texts: ${newTexts.length}`)
  this.metrics.newKeys += newTexts.length
      if (this.options.skipExistingTranslation !== false) {
        try {
          newlyTranslated = await this.translationService.translateBatch(newTexts)
          this.localeFileManager.addTranslations(newlyTranslated)
        } catch (e) {
          console.error('[auto-i18n] translate error', e)
        }
      }
    }

    const existingUsed = this.localeFileManager.getTranslations(allTexts.filter(t => !newTexts.includes(t)))
    const toSave = [...existingUsed, ...newlyTranslated]

    if (toSave.length > 0) {
      this.localeFileManager.saveTranslations(toSave)
      // totalKeys: 当前翻译文件累积总 key 数；processed: 本次涉及（新增+已存在使用）数量
      const totalKeys = this.localeFileManager.getTotalKeyCount()
      const processedCount = toSave.length
      this.log('minimal', 'translate', `saved locales: keys(total)=${totalKeys} processed=${processedCount} new=${newlyTranslated.length}`)
    }
    this.translationsProcessed = true
    this.processedTexts.clear()
  }

  private outputSummary() {
    // totalKeys: 当前翻译文件总 key 数（加载后）
    const totalKeys = this.localeFileManager.getTotalKeyCount?.() ?? 0
    this.log('minimal', 'summary', `Vue files scanned=${this.metrics.scannedVue} updated=${this.metrics.updatedVue} skipped=${this.metrics.skippedVue} chinese=${this.metrics.chineseVue} newKeys=${this.metrics.newKeys} totalKeys=${totalKeys}`)
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

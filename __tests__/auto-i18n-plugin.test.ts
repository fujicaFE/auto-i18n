const AutoI18nPlugin = require('../src/index')
import { AutoI18nPluginOptions } from '../src/types'

// Define AutoI18nPlugin type
type AutoI18nPluginType = InstanceType<typeof AutoI18nPlugin>

// Mock webpack compiler and compilation
const mockWebpack = {
  sources: {
    RawSource: class {
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
  }
}

const createMockCompiler = () => {
  const compilation = {
    hooks: {
      processAssets: {
        tapAsync: jest.fn()
      },
      optimizeAssets: {
        tapAsync: jest.fn()
      }
    },
    PROCESS_ASSETS_STAGE_ANALYSE: 'analyse',
    updateAsset: jest.fn()
  }

  return {
    webpack: mockWebpack,
    hooks: {
      compilation: {
        tap: jest.fn((name, callback) => {
          callback(compilation)
        })
      }
    }
  }
}

describe('AutoI18nPlugin', () => {
  let plugin: AutoI18nPluginType
  let mockCompiler: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockCompiler = createMockCompiler()
  })

  describe('constructor', () => {
    test('should initialize with default options', () => {
      plugin = new AutoI18nPlugin({})

      expect(plugin.options.outputPath).toBe('./src/locales')
      expect(plugin.options.sourceLanguage).toBe('zh')
      expect(plugin.options.targetLanguages).toEqual(['en', 'zh-TW'])
      expect(plugin.options.apiProvider).toBe('preset')
      expect(plugin.options.ignoreComments).toBe(true)
    })

    test('should merge custom options with defaults', () => {
      const customOptions: AutoI18nPluginOptions = {
        outputPath: './locales',
        apiProvider: 'google',
        targetLanguages: ['en', 'fr', 'es'],
        ignoreComments: false
      }

      plugin = new AutoI18nPlugin(customOptions)

      expect(plugin.options.outputPath).toBe('./locales')
      expect(plugin.options.apiProvider).toBe('google')
      expect(plugin.options.targetLanguages).toEqual(['en', 'fr', 'es'])
      expect(plugin.options.ignoreComments).toBe(false)
      expect(plugin.options.sourceLanguage).toBe('zh') // default value
    })

    test('should initialize service instances', () => {
      plugin = new AutoI18nPlugin({})

      expect(plugin.translationService).toBeDefined()
      expect(plugin.localeFileManager).toBeDefined()
      expect(plugin.chineseExtractor).toBeDefined()
    })
  })

  describe('apply', () => {
    beforeEach(() => {
      plugin = new AutoI18nPlugin({})
    })

    test('should register compilation hook', () => {
      plugin.apply(mockCompiler)

      expect(mockCompiler.hooks.compilation.tap).toHaveBeenCalledWith(
        'AutoI18nPlugin',
        expect.any(Function)
      )
    })

    test('should handle webpack 5.x processAssets hook', () => {
      plugin.apply(mockCompiler)

      const compilation = mockCompiler.hooks.compilation.tap.mock.calls[0][1]
      const mockCompilation = {
        hooks: {
          processAssets: {
            tapAsync: jest.fn()
          }
        },
        PROCESS_ASSETS_STAGE_ANALYSE: 'analyse'
      }

      compilation(mockCompilation)

      expect(mockCompilation.hooks.processAssets.tapAsync).toHaveBeenCalledWith(
        { name: 'AutoI18nPlugin', stage: 'analyse' },
        expect.any(Function)
      )
    })

    test('should handle webpack 4.x optimizeAssets hook fallback', () => {
      plugin.apply(mockCompiler)

      const compilation = mockCompiler.hooks.compilation.tap.mock.calls[0][1]
      const mockCompilation = {
        hooks: {
          optimizeAssets: {
            tapAsync: jest.fn()
          }
        }
        // No PROCESS_ASSETS_STAGE_ANALYSE for webpack 4.x
      }

      compilation(mockCompilation)

      expect(mockCompilation.hooks.optimizeAssets.tapAsync).toHaveBeenCalledWith(
        'AutoI18nPlugin',
        expect.any(Function)
      )
    })
  })

  describe('asset processing', () => {
    let mockAssets: any
    let mockCallback: jest.Mock

    beforeEach(() => {
      plugin = new AutoI18nPlugin({ transformCode: true })
      mockAssets = {
        'main.js': {
          source: () => 'const message = "你好，世界";'
        },
        'App.vue': {
          source: () => '<template><div>{{ "测试内容" }}</div></template>'
        },
        'styles.css': {
          source: () => '.class { color: red; }'
        }
      }
      mockCallback = jest.fn()

      // Mock the services
      plugin.chineseExtractor.extractFromJsFile = jest.fn().mockReturnValue(['你好，世界'])
      plugin.chineseExtractor.extractFromVueFile = jest.fn().mockReturnValue(['测试内容'])
      plugin.localeFileManager.loadTranslations = jest.fn().mockResolvedValue(undefined)
      plugin.localeFileManager.hasTranslation = jest.fn().mockReturnValue(false)
      plugin.translationService.translateBatch = jest.fn().mockResolvedValue([])
      plugin.localeFileManager.addTranslations = jest.fn()
      plugin.localeFileManager.saveTranslations = jest.fn()
    })

    test('should filter and process only JS and Vue files', async () => {
      plugin.apply(mockCompiler)

      const compilation = mockCompiler.hooks.compilation.tap.mock.calls[0][1]
      const mockCompilation = {
        hooks: {
          processAssets: {
            tapAsync: jest.fn((options, callback) => {
              callback(mockAssets, mockCallback)
            })
          }
        },
        PROCESS_ASSETS_STAGE_ANALYSE: 'analyse',
        updateAsset: jest.fn()
      }

      compilation(mockCompilation)

      expect(plugin.chineseExtractor.extractFromJsFile).toHaveBeenCalledWith('const message = "你好，世界";')
      expect(plugin.chineseExtractor.extractFromVueFile).toHaveBeenCalledWith('<template><div>{{ "测试内容" }}</div></template>')
      expect(mockCallback).toHaveBeenCalled()
    })

    test('should exclude files based on exclude patterns', async () => {
      plugin = new AutoI18nPlugin({
        exclude: ['/node_modules/', /\.min\.js$/],
        transformCode: true
      })

      mockAssets = {
        'main.js': { source: () => 'const message = "你好";' },
        'node_modules/lib.js': { source: () => 'const lib = "库";' },
        'app.min.js': { source: () => 'const min = "压缩";' }
      }

      plugin.chineseExtractor.extractFromJsFile = jest.fn().mockReturnValue(['你好'])

      plugin.apply(mockCompiler)

      const compilation = mockCompiler.hooks.compilation.tap.mock.calls[0][1]
      const mockCompilation = {
        hooks: {
          processAssets: {
            tapAsync: jest.fn((options, callback) => {
              callback(mockAssets, mockCallback)
            })
          }
        },
        PROCESS_ASSETS_STAGE_ANALYSE: 'analyse',
        updateAsset: jest.fn()
      }

      compilation(mockCompilation)

      // Should only process main.js, exclude the others
      expect(plugin.chineseExtractor.extractFromJsFile).toHaveBeenCalledTimes(1)
      expect(plugin.chineseExtractor.extractFromJsFile).toHaveBeenCalledWith('const message = "你好";')
    })

    test('should handle translation service errors gracefully', async () => {
      plugin.translationService.translateBatch = jest.fn().mockRejectedValue(new Error('Translation API error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      plugin.apply(mockCompiler)

      const compilation = mockCompiler.hooks.compilation.tap.mock.calls[0][1]
      const mockCompilation = {
        hooks: {
          processAssets: {
            tapAsync: jest.fn((options, callback) => {
              callback(mockAssets, mockCallback)
            })
          }
        },
        PROCESS_ASSETS_STAGE_ANALYSE: 'analyse',
        updateAsset: jest.fn()
      }

      compilation(mockCompilation)

      expect(consoleSpy).toHaveBeenCalledWith('AutoI18nPlugin: Translation error', expect.any(Error))
      expect(mockCallback).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    test('should skip code transformation when transformCode is false', async () => {
      plugin = new AutoI18nPlugin({ transformCode: false })
      plugin.chineseExtractor.extractFromJsFile = jest.fn().mockReturnValue(['你好'])

      plugin.apply(mockCompiler)

      const compilation = mockCompiler.hooks.compilation.tap.mock.calls[0][1]
      const mockCompilation = {
        hooks: {
          processAssets: {
            tapAsync: jest.fn((options, callback) => {
              callback(mockAssets, mockCallback)
            })
          }
        },
        PROCESS_ASSETS_STAGE_ANALYSE: 'analyse',
        updateAsset: jest.fn()
      }

      compilation(mockCompilation)

      // Should extract but not transform
      expect(plugin.chineseExtractor.extractFromJsFile).toHaveBeenCalled()
      expect(mockCompilation.updateAsset).not.toHaveBeenCalled()
    })
  })

  describe('RawSource fallback', () => {
    test('should use fallback RawSource when webpack-sources is not available', () => {
      // Mock compiler without webpack.sources
      const compilerWithoutSources = {
        hooks: {
          compilation: {
            tap: jest.fn()
          }
        }
      }

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      plugin = new AutoI18nPlugin({})
      plugin.apply(compilerWithoutSources)

      expect(consoleSpy).toHaveBeenCalledWith(
        'AutoI18nPlugin: Could not find webpack-sources. Using fallback RawSource implementation.'
      )

      consoleSpy.mockRestore()
    })
  })
})
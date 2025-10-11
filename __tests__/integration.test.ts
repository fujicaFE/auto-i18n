import * as path from 'path'
import * as fs from 'fs'
const AutoI18nPlugin = require('../src/index')

// Mock webpack modules
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

// Mock fs for locale file operations
jest.mock('fs')
const mockedFs = fs as jest.Mocked<typeof fs>

// Mock axios for translation service
jest.mock('axios')

// Mock chinese-conv
jest.mock('chinese-conv', () => ({
  chineseToTraditional: (text: string) => `繁${text}`
}))

describe('AutoI18nPlugin Integration Tests', () => {
  let plugin: any
  let mockCompiler: any
  let mockCompilation: any
  let mockAssets: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock file system
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue('{}')
    mockedFs.writeFileSync.mockImplementation(() => {})
    mockedFs.mkdirSync.mockImplementation(() => undefined)

    // Setup mock assets
    mockAssets = {
      'main.js': {
        source: () => `
          const greeting = '你好，世界';
          const button = '点击按钮';
          console.log('调试信息');
        `
      },
      'component.vue': {
        source: () => `
          <template>
            <div>
              <h1>页面标题</h1>
              <button @click="handleClick">提交</button>
            </div>
          </template>
          <script>
          export default {
            data() {
              return {
                message: '欢迎使用'
              }
            }
          }
          </script>
        `
      },
      'styles.css': {
        source: () => '.container { color: red; }'
      }
    }

    // Setup mock compilation
    mockCompilation = {
      hooks: {
        processAssets: {
          tapAsync: jest.fn()
        }
      },
      PROCESS_ASSETS_STAGE_ANALYSE: 'analyse',
      updateAsset: jest.fn()
    }

    // Setup mock compiler
    mockCompiler = {
      webpack: mockWebpack,
      hooks: {
        compilation: {
          tap: jest.fn((name, callback) => {
            callback(mockCompilation)
          })
        }
      }
    }

    // Initialize plugin
    plugin = new AutoI18nPlugin({
      apiProvider: 'preset',
      targetLanguages: ['en', 'zh-TW'],
      outputPath: './test-locales'
    })
  })

  describe('full workflow integration', () => {
    test('should extract, translate, and transform Chinese text in workflow', async () => {
      plugin.apply(mockCompiler)

      // Simulate the processAssets hook being called
      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(mockAssets, () => {
          resolve()
        })
      })

      // Verify that files were processed
      expect(plugin.chineseExtractor.extractFromJsFile).toHaveBeenCalled()
      expect(plugin.chineseExtractor.extractFromVueFile).toHaveBeenCalled()

      // Verify compilation hook was registered
      expect(mockCompiler.hooks.compilation.tap).toHaveBeenCalledWith(
        'AutoI18nPlugin',
        expect.any(Function)
      )
    })

    test('should handle mixed JS and Vue files correctly', async () => {
      plugin.apply(mockCompiler)

      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(mockAssets, () => {
          resolve()
        })
      })

      // Should process both JS and Vue files
      expect(mockCompilation.updateAsset).toHaveBeenCalledWith(
        'main.js',
        expect.any(Object)
      )
      expect(mockCompilation.updateAsset).toHaveBeenCalledWith(
        'component.vue',
        expect.any(Object)
      )

      // Should not process CSS files
      expect(mockCompilation.updateAsset).not.toHaveBeenCalledWith(
        'styles.css',
        expect.any(Object)
      )
    })

    test('should exclude files based on configuration', async () => {
      plugin = new AutoI18nPlugin({
        exclude: ['/vendor/', /\.min\.js$/],
        apiProvider: 'preset'
      })

      const excludedAssets = {
        'main.js': { source: () => 'const text = "你好";' },
        'vendor/lib.js': { source: () => 'const lib = "库文件";' },
        'app.min.js': { source: () => 'const min = "压缩文件";' }
      }

      plugin.apply(mockCompiler)

      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(excludedAssets, () => {
          resolve()
        })
      })

      // Should only process main.js
      expect(mockCompilation.updateAsset).toHaveBeenCalledWith(
        'main.js',
        expect.any(Object)
      )

      // Should not process excluded files
      expect(mockCompilation.updateAsset).not.toHaveBeenCalledWith(
        'vendor/lib.js',
        expect.any(Object)
      )
      expect(mockCompilation.updateAsset).not.toHaveBeenCalledWith(
        'app.min.js',
        expect.any(Object)
      )
    })

    test('should save translation files after processing', async () => {
      plugin.apply(mockCompiler)

      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(mockAssets, () => {
          resolve()
        })
      })

      // Should attempt to write translation files
      expect(mockedFs.writeFileSync).toHaveBeenCalled()

      // Should create output directory
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        './test-locales',
        { recursive: true }
      )
    })
  })

  describe('error handling in integration', () => {
    test('should handle Chinese extraction errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock extraction to throw error
      plugin.chineseExtractor.extractFromJsFile = jest.fn().mockImplementation(() => {
        throw new Error('Extraction error')
      })

      plugin.apply(mockCompiler)

      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(mockAssets, () => {
          resolve()
        })
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error extracting Chinese text'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    test('should handle translation service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock translation service to reject
      plugin.translationService.translateBatch = jest.fn().mockRejectedValue(
        new Error('Translation API error')
      )

      plugin.apply(mockCompiler)

      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(mockAssets, () => {
          resolve()
        })
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'AutoI18nPlugin: Translation error',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    test('should handle code transformation errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Add malformed JavaScript to trigger transformation error
      mockAssets['broken.js'] = {
        source: () => 'const text = "你好; // Syntax error'
      }

      plugin.apply(mockCompiler)

      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(mockAssets, () => {
          resolve()
        })
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error transforming'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('webpack version compatibility', () => {
    test('should work with webpack 4.x (optimizeAssets hook)', async () => {
      // Mock webpack 4.x compilation (no processAssets hook)
      const webpack4Compilation = {
        hooks: {
          optimizeAssets: {
            tapAsync: jest.fn()
          }
        }
        // No PROCESS_ASSETS_STAGE_ANALYSE
      }

      const webpack4Compiler = {
        hooks: {
          compilation: {
            tap: jest.fn((name, callback) => {
              callback(webpack4Compilation)
            })
          }
        }
        // No webpack.sources
      }

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      plugin.apply(webpack4Compiler)

      // Should use optimizeAssets hook for webpack 4.x
      expect(webpack4Compilation.hooks.optimizeAssets.tapAsync).toHaveBeenCalledWith(
        'AutoI18nPlugin',
        expect.any(Function)
      )

      // Should warn about fallback RawSource
      expect(consoleSpy).toHaveBeenCalledWith(
        'AutoI18nPlugin: Could not find webpack-sources. Using fallback RawSource implementation.'
      )

      consoleSpy.mockRestore()
    })

    test('should work with webpack 5.x (processAssets hook)', async () => {
      plugin.apply(mockCompiler)

      // Should use processAssets hook for webpack 5.x
      expect(mockCompilation.hooks.processAssets.tapAsync).toHaveBeenCalledWith(
        { name: 'AutoI18nPlugin', stage: 'analyse' },
        expect.any(Function)
      )
    })
  })

  describe('configuration options integration', () => {
    test('should respect transformCode: false option', async () => {
      plugin = new AutoI18nPlugin({
        transformCode: false,
        apiProvider: 'preset'
      })

      plugin.apply(mockCompiler)

      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(mockAssets, () => {
          resolve()
        })
      })

      // Should extract Chinese text but not transform code
      expect(plugin.chineseExtractor.extractFromJsFile).toHaveBeenCalled()
      expect(mockCompilation.updateAsset).not.toHaveBeenCalled()
    })

    test('should use preset translations when available', async () => {
      plugin = new AutoI18nPlugin({
        apiProvider: 'preset',
        presets: {
          '你好，世界': { en: 'Hello, World', 'zh-TW': '你好，世界' }
        }
      })

      plugin.apply(mockCompiler)

      // Should have preset translations in cache
      expect(plugin.translationService['cache'].has('你好，世界')).toBe(true)
    })
  })

  describe('performance considerations', () => {
    test('should not reprocess files without Chinese text', async () => {
      const englishOnlyAssets = {
        'english.js': {
          source: () => 'const greeting = "Hello World";'
        }
      }

      plugin.apply(mockCompiler)

      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(englishOnlyAssets, () => {
          resolve()
        })
      })

      // Should not transform files without Chinese text
      expect(mockCompilation.updateAsset).not.toHaveBeenCalled()
    })

    test('should handle large number of files efficiently', async () => {
      const manyAssets: any = {}
      
      // Create 100 files with Chinese text
      for (let i = 0; i < 100; i++) {
        manyAssets[`file${i}.js`] = {
          source: () => `const text${i} = '文本${i}';`
        }
      }

      plugin.apply(mockCompiler)

      const processAssetsCallback = mockCompilation.hooks.processAssets.tapAsync.mock.calls[0][1]
      
      const startTime = Date.now()
      
      await new Promise<void>((resolve) => {
        processAssetsCallback(manyAssets, () => {
          resolve()
        })
      })

      const endTime = Date.now()
      const processingTime = endTime - startTime

      // Should complete within reasonable time (less than 5 seconds for 100 files)
      expect(processingTime).toBeLessThan(5000)
      
      // Should process all files
      expect(mockCompilation.updateAsset).toHaveBeenCalledTimes(100)
    })
  })
})
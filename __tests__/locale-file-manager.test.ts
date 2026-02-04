import * as fs from 'fs'
import * as path from 'path'
import { LocaleFileManager } from '../src/utils/locale-file-manager'
import { Translation } from '../src/types'

// Mock fs module
jest.mock('fs')
const mockFs = fs as jest.Mocked<typeof fs>

describe('LocaleFileManager', () => {
  let manager: LocaleFileManager
  const testOutputPath = './test-locales'
  const testLocales = ['en', 'zh-TW', 'fr']

  beforeEach(() => {
    jest.clearAllMocks()
    manager = new LocaleFileManager(testOutputPath, testLocales)
  })

  describe('constructor', () => {
    test('should initialize with correct properties', () => {
      expect(manager['outputPath']).toBe(testOutputPath)
      expect(manager['locales']).toEqual(testLocales)
      expect(manager['translations']).toBeInstanceOf(Map)
    })

    test('should use default locales when not provided', () => {
      const defaultManager = new LocaleFileManager('./output')
      expect(defaultManager['locales']).toEqual(['en', 'zh-TW'])
    })
  })

  describe('hasTranslation', () => {
    test('should return false for empty translations', () => {
      expect(manager.hasTranslation('测试文本')).toBe(false)
    })

    test('should return true for existing translations', () => {
      manager['translations'].set('测试文本', { en: 'test text', 'zh-TW': '測試文本' })
      expect(manager.hasTranslation('测试文本')).toBe(true)
    })
  })

  describe('ensureOutputPath', () => {
    test('should create directory when it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false)

      manager.ensureOutputPath()

      expect(mockFs.existsSync).toHaveBeenCalledWith(testOutputPath)
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(testOutputPath, { recursive: true })
    })

    test('should not create directory when it already exists', () => {
      mockFs.existsSync.mockReturnValue(true)

      manager.ensureOutputPath()

      expect(mockFs.existsSync).toHaveBeenCalledWith(testOutputPath)
      expect(mockFs.mkdirSync).not.toHaveBeenCalled()
    })
  })

  describe('loadExistingTranslations', () => {
    test('should load translations from existing files', () => {
      const enData = { '你好': 'Hello', '世界': 'World' }
      const zhTWData = { '你好': '你好', '世界': '世界' }

      mockFs.existsSync
        .mockReturnValueOnce(true) // outputPath exists
        .mockReturnValueOnce(true) // en.json exists
        .mockReturnValueOnce(true) // zh-TW.json exists
        .mockReturnValueOnce(false) // fr.json does not exist

      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(enData))
        .mockReturnValueOnce(JSON.stringify(zhTWData))

      const result = manager.loadExistingTranslations()

      expect(result).toEqual({
        '你好': { en: 'Hello', 'zh-TW': '你好' },
        '世界': { en: 'World', 'zh-TW': '世界' }
      })
    })

    test('should handle file read errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error')
      })

      const result = manager.loadExistingTranslations()

      expect(result).toEqual({})
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    test('should handle invalid JSON gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue('invalid json')

      const result = manager.loadExistingTranslations()

      expect(result).toEqual({})
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('addTranslations', () => {
    test('should add new translations to memory', () => {
      const translations: Translation[] = [
        {
          source: '你好',
          translations: { en: 'Hello', 'zh-TW': '你好' }
        },
        {
          source: '世界',
          translations: { en: 'World', 'zh-TW': '世界' }
        }
      ]

      manager.addTranslations(translations)

      expect(manager.hasTranslation('你好')).toBe(true)
      expect(manager.hasTranslation('世界')).toBe(true)
      expect(manager['translations'].get('你好')).toEqual({ en: 'Hello', 'zh-TW': '你好' })
    })
  })

  describe('saveTranslations', () => {
    test('should save translations to files by locale', () => {
      const translations: Translation[] = [
        {
          source: '你好',
          translations: { en: 'Hello', 'zh-TW': '你好', fr: 'Bonjour' }
        },
        {
          source: '世界',
          translations: { en: 'World', 'zh-TW': '世界', fr: 'Monde' }
        }
      ]

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      manager.saveTranslations(translations)

      // Should call writeFileSync for each locale
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(3)

      // Check English file
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(testOutputPath, 'en.json'),
        JSON.stringify({ '你好': 'Hello', '世界': 'World' }, null, 2),
        'utf8'
      )

      // Check Traditional Chinese file
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(testOutputPath, 'zh-TW.json'),
        JSON.stringify({ '你好': '你好', '世界': '世界' }, null, 2),
        'utf8'
      )

      // Check French file
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(testOutputPath, 'fr.json'),
        JSON.stringify({ '你好': 'Bonjour', '世界': 'Monde' }, null, 2),
        'utf8'
      )

      expect(consoleSpy).toHaveBeenCalledTimes(3)
      consoleSpy.mockRestore()
    })

    test('should handle write errors gracefully', () => {
      const translations: Translation[] = [
        {
          source: '测试',
          translations: { en: 'Test' }
        }
      ]

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error')
      })

      manager.saveTranslations(translations)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    test('should only save translations for configured locales', () => {
      const translations: Translation[] = [
        {
          source: '测试',
          translations: { en: 'Test', 'zh-TW': '測試', de: 'Test', fr: 'Test' }
        }
      ]

      manager.saveTranslations(translations)

      // Should only save for configured locales (en, zh-TW, fr)
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(3)

      // Should not save German (de) file
      expect(mockFs.writeFileSync).not.toHaveBeenCalledWith(
        expect.stringContaining('de.json'),
        expect.any(String),
        'utf8'
      )
    })
  })

  describe('mergeTranslations', () => {
    test('should merge new translations with existing ones', () => {
      const existingTranslations = {
        '你好': { en: 'Hello', 'zh-TW': '你好' },
        '世界': { en: 'World' }
      }

      const newTranslations: Translation[] = [
        {
          source: '你好',
          translations: { fr: 'Bonjour' } // Should merge with existing
        },
        {
          source: '测试',
          translations: { en: 'Test', 'zh-TW': '測試' } // New translation
        }
      ]

      const result = manager.mergeTranslations(existingTranslations, newTranslations)

      expect(result).toHaveLength(3)
      
      // Should merge 你好 translations
      const helloTranslation = result.find(t => t.source === '你好')
      expect(helloTranslation?.translations).toEqual({
        fr: 'Bonjour',
        en: 'Hello',
        'zh-TW': '你好'
      })

      // Should include existing 世界 translation
      const worldTranslation = result.find(t => t.source === '世界')
      expect(worldTranslation?.translations).toEqual({ en: 'World' })

      // Should include new 测试 translation
      const testTranslation = result.find(t => t.source === '测试')
      expect(testTranslation?.translations).toEqual({ en: 'Test', 'zh-TW': '測試' })
    })

    test('should preserve existing translations when no new ones provided', () => {
      const existingTranslations = {
        '你好': { en: 'Hello', 'zh-TW': '你好' },
        '世界': { en: 'World' }
      }

      const result = manager.mergeTranslations(existingTranslations, [])

      expect(result).toHaveLength(2)
      expect(result.find(t => t.source === '你好')?.translations).toEqual({ en: 'Hello', 'zh-TW': '你好' })
      expect(result.find(t => t.source === '世界')?.translations).toEqual({ en: 'World' })
    })

    test('should handle empty existing translations', () => {
      const newTranslations: Translation[] = [
        {
          source: '测试',
          translations: { en: 'Test' }
        }
      ]

      const result = manager.mergeTranslations({}, newTranslations)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        source: '测试',
        translations: { en: 'Test' }
      })
    })
  })

  describe('loadTranslations', () => {
    test('should load translations and populate internal map', async () => {
      const mockTranslations = {
        '你好': { en: 'Hello', 'zh-TW': '你好' },
        '世界': { en: 'World', 'zh-TW': '世界' }
      }

      jest.spyOn(manager, 'loadExistingTranslations').mockReturnValue(mockTranslations)

      await manager.loadTranslations()

      expect(manager.hasTranslation('你好')).toBe(true)
      expect(manager.hasTranslation('世界')).toBe(true)
      expect(manager['translations'].get('你好')).toEqual({ en: 'Hello', 'zh-TW': '你好' })
    })
  })

  describe('getTranslationMap', () => {
    test('should return translations in transformation format', () => {
      // 直接设置内存中的翻译
      manager['translations'].set('你好', { en: 'Hello', 'zh-TW': '你好' })
      manager['translations'].set('世界', { en: 'World', 'zh-TW': '世界' })

      const result = manager.getTranslationMap()

      expect(result).toEqual({
        '你好': { en: 'Hello', 'zh-TW': '你好' },
        '世界': { en: 'World', 'zh-TW': '世界' }
      })
    })

    test('should return empty object when no translations loaded', () => {
      const result = manager.getTranslationMap()
      expect(result).toEqual({})
    })

    test('should reflect updates after addTranslations', () => {
      const translations: Translation[] = [
        {
          source: '测试',
          translations: { en: 'Test', 'zh-TW': '測試' }
        }
      ]

      manager.addTranslations(translations)
      const result = manager.getTranslationMap()

      expect(result['测试']).toEqual({ en: 'Test', 'zh-TW': '測試' })
    })
  })
})
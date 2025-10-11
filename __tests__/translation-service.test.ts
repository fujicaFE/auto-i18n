import axios from 'axios'
import * as crypto from 'crypto-js'
import { TranslationService } from '../src/utils/translation-service'
import { TranslationServiceOptions } from '../src/types'

// Mock dependencies
jest.mock('axios')
jest.mock('crypto-js')
jest.mock('chinese-conv', () => ({
  chineseToTraditional: jest.fn()
}))

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedCrypto = crypto as jest.Mocked<typeof crypto>

// Import the mocked function
const { chineseToTraditional } = require('chinese-conv')
const mockedChineseConv = chineseToTraditional as jest.MockedFunction<(text: string) => string>

describe('TranslationService', () => {
  let service: TranslationService
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockedChineseConv.mockImplementation((text: string) => `繁${text}`)
  })

  describe('constructor', () => {
    test('should initialize with default options', () => {
      service = new TranslationService({})

      expect(service['options']).toEqual({
        apiKey: '',
        apiProvider: 'preset',
        sourceLanguage: 'zh',
        targetLanguages: ['en', 'zh-TW'],
        presets: {}
      })
    })

    test('should merge custom options with defaults', () => {
      const customOptions: TranslationServiceOptions = {
        apiKey: 'test-key',
        apiProvider: 'google',
        sourceLanguage: 'zh-CN',
        targetLanguages: ['en', 'fr', 'de'],
        presets: {
          '你好': { en: 'Hello', fr: 'Bonjour' }
        }
      }

      service = new TranslationService(customOptions)

      expect(service['options']).toEqual({
        apiKey: 'test-key',
        apiProvider: 'google',
        sourceLanguage: 'zh-CN',
        targetLanguages: ['en', 'fr', 'de'],
        presets: {
          '你好': { en: 'Hello', fr: 'Bonjour' }
        }
      })
    })

    test('should preload preset translations into cache', () => {
      const presets = {
        '你好': { en: 'Hello', 'zh-TW': '你好' },
        '世界': { en: 'World', 'zh-TW': '世界' }
      }

      service = new TranslationService({ presets })

      expect(service['cache'].has('你好')).toBe(true)
      expect(service['cache'].has('世界')).toBe(true)
      expect(service['cache'].get('你好')).toEqual({ en: 'Hello', 'zh-TW': '你好' })
    })
  })

  describe('translateBatch with provider "preset"', () => {
    beforeEach(() => {
      service = new TranslationService({
        apiProvider: 'preset',
        targetLanguages: ['en', 'zh-TW', 'fr']
      })
    })

    test('should convert to traditional Chinese and use placeholders for other languages', async () => {
      const texts = ['你好', '世界']

      const result = await service.translateBatch(texts)

      expect(result).toHaveLength(2)
      
      expect(result[0]).toEqual({
        source: '你好',
        translations: {
          'zh-TW': '繁你好',
          en: '[en] 你好',
          fr: '[fr] 你好'
        }
      })

      expect(result[1]).toEqual({
        source: '世界',
        translations: {
          'zh-TW': '繁世界',
          en: '[en] 世界',
          fr: '[fr] 世界'
        }
      })

      expect(mockedChineseConv).toHaveBeenCalledWith('你好')
      expect(mockedChineseConv).toHaveBeenCalledWith('世界')
    })

    test('should return cached translations when available', async () => {
      // Pre-populate cache
      service['cache'].set('你好', { en: 'Hello', 'zh-TW': '你好' })

      const result = await service.translateBatch(['你好', '世界'])

      expect(result).toHaveLength(2)
      
      // Should use cached translation
      expect(result[0]).toEqual({
        source: '你好',
        translations: { en: 'Hello', 'zh-TW': '你好' }
      })

      // Should translate new text
      expect(result[1].source).toBe('世界')
      expect(result[1].translations['zh-TW']).toBe('繁世界')
    })

    test('should return empty array when all texts are cached', async () => {
      service['cache'].set('你好', { en: 'Hello' })
      service['cache'].set('世界', { en: 'World' })

      const result = await service.translateBatch(['你好', '世界'])

      expect(result).toHaveLength(2)
      expect(result[0].translations).toEqual({ en: 'Hello' })
      expect(result[1].translations).toEqual({ en: 'World' })
    })
  })

  describe('translateBatch with provider "baidu"', () => {
    beforeEach(() => {
      service = new TranslationService({
        apiProvider: 'baidu',
        apiKey: 'test-key',
        targetLanguages: ['en', 'zh-TW']
      })

      // Mock the private translateWithBaidu method
      jest.spyOn(service as any, 'translateWithBaidu')
        .mockImplementation(async (...args: any[]) => {
          const [text, targetLang] = args as [string, string]
          if (targetLang === 'en') {
            return text === '你好' ? 'Hello' : 'World'
          }
          return `[${targetLang}] ${text}`
        })
    })

    test('should use Baidu API for translations except zh-TW', async () => {
      const result = await service.translateBatch(['你好', '世界'])

      expect(result).toHaveLength(2)

      // Check first translation
      expect(result[0]).toEqual({
        source: '你好',
        translations: {
          en: 'Hello',
          'zh-TW': '繁你好'
        }
      })

      // Check second translation
      expect(result[1]).toEqual({
        source: '世界',
        translations: {
          en: 'World',
          'zh-TW': '繁世界'
        }
      })

      // Traditional Chinese should use direct conversion
      expect(mockedChineseConv).toHaveBeenCalledWith('你好')
      expect(mockedChineseConv).toHaveBeenCalledWith('世界')

      // English should use Baidu API
      expect(service['translateWithBaidu']).toHaveBeenCalledWith('你好', 'en')
      expect(service['translateWithBaidu']).toHaveBeenCalledWith('世界', 'en')
    })

    test('should handle API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock API to throw error
      jest.spyOn(service as any, 'translateWithBaidu')
        .mockRejectedValue(new Error('API Error'))

      const result = await service.translateBatch(['你好'])

      expect(result[0].translations.en).toBe('[en] 你好') // Fallback text
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('翻译错误'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('translateWithBaidu (private method)', () => {
    beforeEach(() => {
      service = new TranslationService({
        apiProvider: 'baidu',
        apiKey: 'test-key'
      })

      // Mock crypto functions
      mockedCrypto.MD5.mockImplementation((...args: any[]) => ({ toString: () => `md5_${args[0]}` }) as any)
    })

    test('should make correct API request', async () => {
      const mockResponse = {
        data: {
          trans_result: [
            { dst: 'Hello' }
          ]
        }
      }

      mockedAxios.get.mockResolvedValue(mockResponse)

      const result = await (service as any).translateWithBaidu('你好', 'en')

      expect(result).toBe('Hello')
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://fanyi-api.baidu.com/api/trans/vip/translate',
        {
          params: expect.objectContaining({
            q: '你好',
            from: 'zh',
            to: 'en',
            appid: 'test-key'
          })
        }
      )
    })

    test('should handle API response errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      await expect((service as any).translateWithBaidu('你好', 'en'))
        .rejects.toThrow('Network error')
    })

    test('should handle invalid API response format', async () => {
      const mockResponse = {
        data: {
          error_code: 52001,
          error_msg: 'Request timeout'
        }
      }

      mockedAxios.get.mockResolvedValue(mockResponse)

      await expect((service as any).translateWithBaidu('你好', 'en'))
        .rejects.toThrow('翻译失败')
    })

    test('should generate correct sign for Baidu API', async () => {
      const mockResponse = {
        data: {
          trans_result: [{ dst: 'Hello' }]
        }
      }

      mockedAxios.get.mockResolvedValue(mockResponse)

      await (service as any).translateWithBaidu('你好', 'en')

      // Verify MD5 was called for sign generation
      expect(mockedCrypto.MD5).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('should handle empty texts array', async () => {
      service = new TranslationService({ apiProvider: 'none' })

      const result = await service.translateBatch([])

      expect(result).toEqual([])
    })

    test('should handle undefined target languages', async () => {
      service = new TranslationService({
        apiProvider: 'none',
        targetLanguages: undefined
      })

      const result = await service.translateBatch(['你好'])

      expect(result[0].translations).toEqual({
        'zh-TW': '繁你好',
        en: '[en] 你好'
      })
    })
  })

  describe('cache management', () => {
    test('should add translations to cache after processing', async () => {
      service = new TranslationService({ apiProvider: 'none' })

      await service.translateBatch(['你好'])

      expect(service['cache'].has('你好')).toBe(true)
      expect(service['cache'].get('你好')).toEqual({
        'zh-TW': '繁你好',
        en: '[en] 你好'
      })
    })

    test('should not duplicate processing for same text', async () => {
      service = new TranslationService({ apiProvider: 'none' })

      // First call
      await service.translateBatch(['你好'])
      
      // Second call should use cache
      const result = await service.translateBatch(['你好'])

      expect(mockedChineseConv).toHaveBeenCalledTimes(1) // Only called once
      expect(result[0].translations).toEqual({
        'zh-TW': '繁你好',
        en: '[en] 你好'
      })
    })
  })
})
// Jest setup file for common test configurations

// Global test timeout
jest.setTimeout(10000)

// Mock console methods to avoid cluttering test output
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
const originalConsoleLog = console.log

beforeEach(() => {
  // Suppress console output in tests unless explicitly testing console methods
  console.error = jest.fn()
  console.warn = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  // Restore console methods after each test
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
  console.log = originalConsoleLog
})

// Global test helpers
global.testHelper = {
  createMockWebpackCompiler: () => ({
    hooks: {
      compilation: {
        tap: jest.fn()
      }
    }
  }),

  createMockCompilation: () => ({
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
  }),

  createMockAssets: (sources: Record<string, string>) => {
    const assets: any = {}
    for (const [filename, source] of Object.entries(sources)) {
      assets[filename] = {
        source: () => source
      }
    }
    return assets
  }
}

// Add type definitions for global helpers
declare global {
  var testHelper: {
    createMockWebpackCompiler: () => any
    createMockCompilation: () => any
    createMockAssets: (sources: Record<string, string>) => any
  }
}

export {}
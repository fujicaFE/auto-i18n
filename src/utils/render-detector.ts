/**
 * Vue Render 函数检测器
 * 负责检测和分析Vue组件的render函数
 */

export interface RenderDetectionResult {
  hasRenderFunction: boolean
  vueVersion: 'vue2' | 'vue3' | 'unknown'
  patterns: string[]
}

export class RenderDetector {
  /**
   * 检查AST是否包含render函数
   */
  checkForRenderFunction(ast: any): boolean {
    if (!ast || !ast.body) return false
    
    // 检查AST中是否包含render函数的特征
    // Vue编译后的render函数通常包含特定的模式
    const sourceCode = JSON.stringify(ast)
    return sourceCode.includes('render') || 
           sourceCode.includes('_createElementVNode') ||
           sourceCode.includes('_toDisplayString') ||
           sourceCode.includes('createVNode')
  }

  /**
   * 检查编译后的代码中是否包含Vue render函数的特征
   */
  checkForRenderInEmittedCode(source: string): RenderDetectionResult {
    // Vue 3的render函数通常包含这些模式
    const vue3Patterns = [
      '_createElementVNode',
      '_toDisplayString', 
      'createVNode',
      '_renderSlot',
      '_withCtx',
      '_openBlock',
      '_createElementBlock',
      '_createTextVNode'
    ]
    
    // Vue 2的render函数模式
    const vue2Patterns = [
      '_c(',  // createElement的简写
      '_v(',  // createTextVNode的简写
      '_s(',  // toString的简写
      '.render',
      'h('
    ]
    
    const matchedVue3Patterns = vue3Patterns.filter(pattern => source.includes(pattern))
    const matchedVue2Patterns = vue2Patterns.filter(pattern => source.includes(pattern))
    
    const hasVue3Render = matchedVue3Patterns.length > 0
    const hasVue2Render = matchedVue2Patterns.length > 0
    const hasVueRender = hasVue3Render || hasVue2Render
    
    let vueVersion: 'vue2' | 'vue3' | 'unknown' = 'unknown'
    if (hasVue3Render && !hasVue2Render) {
      vueVersion = 'vue3'
    } else if (hasVue2Render && !hasVue3Render) {
      vueVersion = 'vue2'
    } else if (hasVue3Render && hasVue2Render) {
      // 如果两种模式都有，可能是混合或者误检，默认为vue2（更常见）
      vueVersion = 'vue2'
    }
    
    return {
      hasRenderFunction: hasVueRender,
      vueVersion,
      patterns: [...matchedVue3Patterns, ...matchedVue2Patterns]
    }
  }

  /**
   * 简化路径显示，只显示关键部分
   */
  shortenPath(filePath: string): string {
    if (filePath.length > 100) {
      const parts = filePath.split(/[\\\/]/)
      const relevantParts = parts.slice(-3) // 只取最后3个部分
      return '...' + require('path').sep + relevantParts.join(require('path').sep)
    }
    return filePath
  }

  /**
   * 检查资源是否应该被转换
   */
  shouldTransformFile(resource: string, excludePatterns: (string | RegExp)[] = []): boolean {
    if (!resource) return false
    if (resource.includes('node_modules')) return false
    
    // 检查是否在排除名单中
    if (excludePatterns && excludePatterns.length > 0) {
      for (const excludePattern of excludePatterns) {
        if (typeof excludePattern === 'string' && resource.includes(excludePattern)) {
          return false
        } else if (excludePattern instanceof RegExp && excludePattern.test(resource)) {
          return false
        }
      }
    }
    
    // 处理vue-loader的特殊路径格式
    // 例如: src\App.vue?vue&type=template&id=xxx
    const cleanResource = resource.split('?')[0] // 移除查询参数
    const ext = require('path').extname(cleanResource).toLowerCase()
    
    // 跳过样式部分
    if (resource.includes('?vue&type=style')) {
      return false
    }
    
    // 对于Vue文件，我们要处理：
    // 1. 原始的 .vue 文件（在被vue-loader分解之前）
    // 2. template 部分：App.vue?vue&type=template
    // 3. script 部分：App.vue?vue&type=script
    
    if (ext === '.vue') {
      // 原始Vue文件或者template/script部分
      if (!resource.includes('?vue&type=') || 
          resource.includes('?vue&type=template') || 
          resource.includes('?vue&type=script')) {
        return true
      }
      return false
    }
    
    // 处理普通的JS/TS文件
    return ['.js', '.ts', '.jsx', '.tsx'].includes(ext)
  }
}
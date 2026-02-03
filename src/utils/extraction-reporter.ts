/**
 * 中文提取报告生成器
 * 负责生成 HTML 格式的中文提取分析报告
 */

export interface ExtractedItem {
  text: string
  source: 'ast' | 'regex'
  category: string
  filePath?: string
}

export interface ExtractionReport {
  timestamp: string
  totalCount: number
  astCount: number
  regexCount: number
  items: ExtractedItem[]
}

export class ExtractionReporter {
  private items: ExtractedItem[] = []

  /**
   * 添加提取的文本
   */
  addItem(text: string, source: 'ast' | 'regex', category: string, filePath?: string) {
    this.items.push({ text, source, category, filePath })
  }

  /**
   * 生成 HTML 报告
   */
  generateReport(filePath?: string): string {
    const astItems = this.items.filter(item => item.source === 'ast')
    const regexItems = this.items.filter(item => item.source === 'regex')
    const totalCount = this.items.length

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>中文提取报告 - Auto i18n</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .header p {
      font-size: 14px;
      opacity: 0.9;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 40px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .stat-card h3 {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .stat-card .number {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
    }

    .stat-card.ast-card {
      border-left-color: #667eea;
    }

    .stat-card.regex-card {
      border-left-color: #f093fb;
    }

    .stat-card.total-card {
      border-left-color: #764ba2;
    }

    .content {
      padding: 40px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section h2 {
      font-size: 20px;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-icon {
      font-size: 24px;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    thead {
      background: #f5f5f5;
    }

    th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
    }

    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
      word-break: break-word;
    }

    tbody tr:hover {
      background: #f9f9f9;
    }

    tbody tr:nth-child(odd) {
      background: #fafafa;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-ast {
      background: #e3f2fd;
      color: #1976d2;
    }

    .badge-regex {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .category-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      background: #e0e0e0;
      color: #555;
      margin-right: 8px;
    }

    .empty-message {
      text-align: center;
      padding: 40px;
      color: #999;
      font-size: 14px;
    }

    .footer {
      background: #f5f5f5;
      padding: 20px;
      text-align: center;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .progress-bar {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-segment {
      height: 100%;
      border-radius: 2px;
    }

    .progress-ast {
      background: #667eea;
      flex: var(--ast-ratio);
    }

    .progress-regex {
      background: #f093fb;
      flex: var(--regex-ratio);
    }

    @media (max-width: 768px) {
      .stats {
        grid-template-columns: 1fr;
      }

      .header {
        padding: 20px;
      }

      .header h1 {
        font-size: 24px;
      }

      .content {
        padding: 20px;
      }

      table {
        font-size: 12px;
      }

      th, td {
        padding: 8px 12px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌐 中文提取分析报告</h1>
      <p>Auto i18n 插件生成 | ${new Date().toLocaleString('zh-CN')}</p>
    </div>

    <div class="stats">
      <div class="stat-card total-card">
        <h3>总提取数量</h3>
        <div class="number">${totalCount}</div>
      </div>
      <div class="stat-card ast-card">
        <h3>AST 识别</h3>
        <div class="number">${astItems.length}</div>
        <div class="progress-bar">
          <div class="progress-segment progress-ast" style="--ast-ratio: ${astItems.length}; --regex-ratio: ${regexItems.length}"></div>
          <div class="progress-segment progress-regex"></div>
        </div>
      </div>
      <div class="stat-card regex-card">
        <h3>正则匹配</h3>
        <div class="number">${regexItems.length}</div>
      </div>
    </div>

    <div class="content">
      ${astItems.length > 0 ? this.renderSection('AST 方式提取', astItems, '✨') : ''}
      ${regexItems.length > 0 ? this.renderSection('正则方式提取', regexItems, '🔍') : ''}
      ${totalCount === 0 ? '<div class="empty-message">🎉 未发现中文文本，无需国际化</div>' : ''}
    </div>

    <div class="footer">
      <p>📊 报告生成于 ${filePath ? `文件: ${filePath}` : '动态生成'}</p>
      <p>自动国际化插件 © 2024 Auto i18n</p>
    </div>
  </div>
</body>
</html>`

    return html
  }

  /**
   * 渲染一个数据表格部分
   */
  private renderSection(title: string, items: ExtractedItem[], icon: string): string {
    const categoryMap = new Map<string, ExtractedItem[]>()

    // 按分类分组
    for (const item of items) {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, [])
      }
      categoryMap.get(item.category)!.push(item)
    }

    let html = `<div class="section">
      <h2>${icon} ${title} <span style="font-size: 14px; color: #999; font-weight: 400;">(${items.length} 项)</span></h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">来源</th>
              <th style="width: 15%;">分类</th>
              <th style="width: 75%;">中文文本</th>
            </tr>
          </thead>
          <tbody>`

    for (const item of items) {
      const badgeClass = item.source === 'ast' ? 'badge-ast' : 'badge-regex'
      const sourceLabel = item.source === 'ast' ? 'AST' : '正则'
      html += `
            <tr>
              <td><span class="badge ${badgeClass}">${sourceLabel}</span></td>
              <td><span class="category-badge">${this.escapHtml(item.category)}</span></td>
              <td><strong>${this.escapHtml(item.text)}</strong></td>
            </tr>`
    }

    html += `
          </tbody>
        </table>
      </div>
    </div>`

    return html
  }

  /**
   * 转义 HTML 特殊字符
   */
  private escapHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, char => map[char])
  }

  /**
   * 生成报告文件路径
   */
  static getReportPath(outputPath: string): string {
    const path = require('path')
    const fs = require('fs')
    const reportDir = path.join(outputPath, '.extraction-reports')
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return path.join(reportDir, `extraction-report-${timestamp}.html`)
  }

  /**
   * 保存报告到文件
   */
  saveReport(outputPath: string): string {
    const fs = require('fs')
    const reportPath = ExtractionReporter.getReportPath(outputPath)
    const html = this.generateReport(reportPath)
    
    fs.writeFileSync(reportPath, html, 'utf-8')
    return reportPath
  }

  /**
   * 清空数据
   */
  clear() {
    this.items = []
  }

  /**
   * 获取报告数据
   */
  getReport(): ExtractionReport {
    const astItems = this.items.filter(item => item.source === 'ast')
    const regexItems = this.items.filter(item => item.source === 'regex')

    return {
      timestamp: new Date().toISOString(),
      totalCount: this.items.length,
      astCount: astItems.length,
      regexCount: regexItems.length,
      items: this.items
    }
  }
}

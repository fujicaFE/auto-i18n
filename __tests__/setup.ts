// Jest 全局初始化
// 可在此放置 polyfill / 全局mock，如后续需要扩展再调整
// 当前保持最小内容，确保配置文件中 setupFilesAfterEnv 不报错

// 示例：全局日志降噪
const origWarn = console.warn
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('[auto-i18n] transform file failed')) {
    // 在测试中过滤特定警告，可根据需要改成收集
    return
  }
  origWarn(...args)
}

export {}
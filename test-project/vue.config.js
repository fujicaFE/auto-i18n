const AutoI18nPlugin = require('../lib/index.js')

module.exports = {
  transpileDependencies: [],
  
  chainWebpack: config => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const DEV_I18N_MODE = process.env.DEV_I18N_MODE || 'hardcoded'
    const cleanDEV_I18N_MODE = DEV_I18N_MODE ? DEV_I18N_MODE.trim() : 'hardcoded'
    
    // 如果启用内存转换，添加我们的loader - 用最简单的方式
    if (isDevelopment && cleanDEV_I18N_MODE === 'i18n') {
      const loaderPath = require.resolve('../lib/auto-i18n-loader.js')
      console.log('ChainWebpack: Adding simple loader at:', loaderPath)
      
      // 直接为Vue文件添加我们的loader
      config.module
        .rule('auto-i18n-transform')
        .test(/\.vue$/)
        .exclude.add(/node_modules/).end()
        .use('auto-i18n-transform-loader')
        .loader(loaderPath)
        .options({
          memoryTransformOnly: true,
          functionName: '$t',
          outputPath: './src/locales'
        })
        .end()
    }
  },
  
  configureWebpack: (config) => {
    const isProduction = process.env.NODE_ENV === 'production'
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // 添加环境变量来控制开发模式的行为
    // 使用方法：DEV_I18N_MODE=i18n npm run serve
    const DEV_I18N_MODE = process.env.DEV_I18N_MODE || 'hardcoded' // 'hardcoded' | 'i18n'
    
    console.log(`AutoI18n Config: Production=${isProduction}, DEV_I18N_MODE=${DEV_I18N_MODE}`)
    console.log(`AutoI18n Config: isDevelopment=${isDevelopment}`)
    console.log(`AutoI18n Config: DEV_I18N_MODE length=${DEV_I18N_MODE ? DEV_I18N_MODE.length : 'undefined'}`)
    console.log(`AutoI18n Config: DEV_I18N_MODE JSON=${JSON.stringify(DEV_I18N_MODE)}`)
    console.log(`AutoI18n Config: DEV_I18N_MODE === 'i18n' is ${DEV_I18N_MODE === 'i18n'}`)
    console.log(`AutoI18n Config: (isDevelopment && DEV_I18N_MODE === 'i18n') is ${isDevelopment && DEV_I18N_MODE === 'i18n'}`)
    
    // 尝试修复：去除可能的空格和换行符
    const cleanDEV_I18N_MODE = DEV_I18N_MODE ? DEV_I18N_MODE.trim() : 'hardcoded'
    console.log(`AutoI18n Config: cleanDEV_I18N_MODE=${cleanDEV_I18N_MODE}`)
    console.log(`AutoI18n Config: cleanDEV_I18N_MODE === 'i18n' is ${cleanDEV_I18N_MODE === 'i18n'}`)
    
    console.log(`AutoI18n Config: transformCode=${isProduction || (isDevelopment && cleanDEV_I18N_MODE === 'i18n')}`)
    console.log(`AutoI18n Config: memoryTransformOnly=${isDevelopment && cleanDEV_I18N_MODE === 'i18n'}`)
    
    // 开发环境的特殊配置
    if (isDevelopment && cleanDEV_I18N_MODE === 'i18n') {
      // 当启用 i18n 模式时，禁用热更新避免冲突
      if (config.devServer) {
        config.devServer.liveReload = false
        config.devServer.hot = false
      }
    }
    
    return {
      plugins: [
        new AutoI18nPlugin({
          outputPath: './src/locales',
          apiProvider: 'preset',
          targetLanguages: ['en', 'zh-TW', 'ja'],
          // 关键配置：根据环境和模式决定是否转换代码
          transformCode: isProduction || (isDevelopment && cleanDEV_I18N_MODE === 'i18n'),
          // 新增选项：开发环境是否只在内存中转换（不修改源文件）
          memoryTransformOnly: isDevelopment && cleanDEV_I18N_MODE === 'i18n',
          presets: {
          '你好': { en: 'Hello', 'zh-TW': '你好', ja: 'こんにちは' },
          '世界': { en: 'World', 'zh-TW': '世界', ja: '世界' },
          '欢迎': { en: 'Welcome', 'zh-TW': '歡迎', ja: 'ようこそ' },
          '首页': { en: 'Home', 'zh-TW': '首頁', ja: 'ホーム' },
          '关于': { en: 'About', 'zh-TW': '關於', ja: '約' },
          '联系我们': { en: 'Contact Us', 'zh-TW': '聯繫我們', ja: 'お問い合わせ' },
          '用户名': { en: 'Username', 'zh-TW': '用戶名', ja: 'ユーザー名' },
          '密码': { en: 'Password', 'zh-TW': '密碼', ja: 'パスワード' },
          '登录': { en: 'Login', 'zh-TW': '登錄', ja: 'ログイン' },
          '注册': { en: 'Register', 'zh-TW': '註冊', ja: '登録' },
          '提交': { en: 'Submit', 'zh-TW': '提交', ja: '送信' },
          '取消': { en: 'Cancel', 'zh-TW': '取消', ja: 'キャンセル' },
          '确认': { en: 'Confirm', 'zh-TW': '確認', ja: '確認' },
          '搜索': { en: 'Search', 'zh-TW': '搜索', ja: '検索' },
          '删除': { en: 'Delete', 'zh-TW': '刪除', ja: '削除' },
          '编辑': { en: 'Edit', 'zh-TW': '編輯', ja: '編集' },
          '保存': { en: 'Save', 'zh-TW': '保存', ja: '保存' },
          '返回': { en: 'Back', 'zh-TW': '返回', ja: '戻る' },
          '下一步': { en: 'Next', 'zh-TW': '下一步', ja: '次へ' },
          '上一步': { en: 'Previous', 'zh-TW': '上一步', ja: '前へ' },
          '加载中': { en: 'Loading...', 'zh-TW': '加載中', ja: '読み込み中' },
          '没有数据': { en: 'No Data', 'zh-TW': '沒有數據', ja: 'データなし' },
          '操作成功': { en: 'Operation Successful', 'zh-TW': '操作成功', ja: '操作成功' },
          '操作失败': { en: 'Operation Failed', 'zh-TW': '操作失敗', ja: '操作失敗' }
        },
        ignoreComments: true,
        exclude: ['/node_modules/', /\.min\.js$/]
      })
    ]
    }
  }
}
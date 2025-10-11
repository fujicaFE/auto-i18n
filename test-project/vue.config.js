const AutoI18nPlugin = require('../lib/index.js')

module.exports = {
  transpileDependencies: [],
  
  configureWebpack: (config) => {
    const isProduction = process.env.NODE_ENV === 'production'
    
    return {
      plugins: [
        new AutoI18nPlugin({
          outputPath: './src/locales',
          apiProvider: 'preset',
          targetLanguages: ['en', 'zh-TW', 'ja'],
          transformCode: isProduction, // 只在生产模式下转换代码
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
        transformCode: isProduction,
        ignoreComments: true,
        exclude: ['/node_modules/', /\.min\.js$/]
      })
    ]
    }
  }
}
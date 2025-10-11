// src/main.js - Vue项目示例
import Vue from 'vue';
import VueI18n from 'vue-i18n';
import App from './App.vue';
import router from './router';
import store from './store';

// 导入自动生成的语言文件
import enMessages from './locales/en.json';
import zhTWMessages from './locales/zh-TW.json';
import zhCNMessages from './locales/zh.json'; // 默认中文

// 安装Vue i18n插件
Vue.use(VueI18n);

// 创建i18n实例
const i18n = new VueI18n({
  locale: 'zh', // 默认语言
  fallbackLocale: 'zh', // 回退语言
  messages: {
    'zh': zhCNMessages, // 简体中文
    'en': enMessages,   // 英语
    'zh-TW': zhTWMessages // 繁体中文
  },
  silentTranslationWarn: true
});

// 设置语言切换函数
Vue.prototype.$setLang = function(lang) {
  i18n.locale = lang;
  document.querySelector('html').setAttribute('lang', lang);
  localStorage.setItem('userLanguage', lang);
};

// 初始化语言设置
const savedLanguage = localStorage.getItem('userLanguage');
if (savedLanguage) {
  i18n.locale = savedLanguage;
  document.querySelector('html').setAttribute('lang', savedLanguage);
}

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  i18n, // 注入i18n实例
  render: h => h(App)
}).$mount('#app');

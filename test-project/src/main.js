import Vue from 'vue';
import App from './App.vue';
import i18n from './i18n';
// 挂载全局翻译函数，供自动化转换后的代码使用
window.$t = i18n.t.bind(i18n);

import router from './router';

Vue.config.productionTip = false;

new Vue({
  router,
  i18n,
  render: (h) => h(App)
}).$mount('#app');
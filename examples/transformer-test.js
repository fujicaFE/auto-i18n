// 测试去掉 importStatement 后的 Transformer 功能
const { Transformer } = require('../lib/utils/transformer');

// 创建 Transformer 实例，不再需要 importStatement
const transformer = new Transformer({
  functionName: '$t'
});

// 测试 JavaScript 代码转换
const jsCode = `
export default {
  data() {
    return {
      message: '欢迎使用自动国际化插件',
      title: '首页'
    }
  },
  methods: {
    showMessage() {
      alert('操作成功');
    }
  }
}
`;

// 模拟翻译数据
const translations = {
  '欢迎使用自动国际化插件': {
    'en': 'Welcome to Auto I18n Plugin',
    'zh-TW': '歡迎使用自動國際化插件'
  },
  '首页': {
    'en': 'Home',
    'zh-TW': '首頁'
  },
  '操作成功': {
    'en': 'Operation successful',
    'zh-TW': '操作成功'
  }
};

console.log('原始代码:');
console.log(jsCode);

console.log('\n转换后的代码:');
const transformedCode = transformer.transform(jsCode, translations);
console.log(transformedCode);

// 测试 Vue 文件转换
const vueCode = `
<template>
  <div>
    <h1>首页</h1>
    <p>欢迎使用自动国际化插件</p>
    <button @click="handleClick">确认</button>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  methods: {
    handleClick() {
      this.$message.success('操作成功');
    }
  }
}
</script>
`;

console.log('\n\n原始 Vue 文件:');
console.log(vueCode);

console.log('\n转换后的 Vue 文件:');
const transformedVue = transformer.transform(vueCode, {
  ...translations,
  '确认': { 'en': 'Confirm', 'zh-TW': '確認' }
});
console.log(transformedVue);
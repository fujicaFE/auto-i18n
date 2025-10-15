// 创建测试用例来验证 props 中的中文处理
const { Transformer } = require('../lib/utils/transformer');

const transformer = new Transformer({
  functionName: '$t',
  globalFunctionName: 'i18n.t'
});

// 测试包含 props 的 Vue 组件
const testComponent = `
<template>
  <div>
    <h1>{{ 哈哈哈 }}</h1>
    <h1>{{ title }}</h1>
    <p>{{ message }}</p>
  </div>
</template>

<script>
export default {
  name: 'TestComponent',
  props: {
    title: {
      type: String,
      default: '默认标题'
    },
    message: {
      type: String,
      default: '欢迎使用系统'
    },
    note: {
      type: String,
      default: () => '函数默认'
    },
    config: {
      type: Object,
      default: () => ({
        label: '配置标签',
        nested: {
          text: '嵌套文本'
        }
      })
    }
  },
  data() {
    return {
      status: '正常状态',
      info: {
        name: '张三',
        role: '管理员'
      }
    }
  },
  methods: {
    showMessage() {
      alert('操作成功');
    }
  }
}
</script>
`;

const translations = {
  '默认标题': { 'en': 'Default Title' },
  '欢迎使用系统': { 'en': 'Welcome to the system' },
  '函数默认': { 'en': 'Function Default' },
  '配置标签': { 'en': 'Config Label' },
  '嵌套文本': { 'en': 'Nested Text' },
  '正常状态': { 'en': 'Normal status' },
  '张三': { 'en': 'Zhang San' },
  '管理员': { 'en': 'Administrator' },
  '操作成功': { 'en': 'Operation successful' }
};

console.log('原始组件:');
console.log(testComponent);

console.log('\n转换后:');
const result = transformer.transform(testComponent, translations);
console.log(result);
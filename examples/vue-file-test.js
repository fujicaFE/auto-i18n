// 测试完整Vue文件转换
const { Transformer } = require('../lib/utils/transformer');

const transformer = new Transformer({
  functionName: '$t'
});

// 测试完整Vue文件
const testVueFile = `
<template>
  <div class="home">
    <div title="哈哈">剩余车位：{{ '--' }}</div>
    <input placeholder="请输入哈哈哈"></input>
    <h1>{{ '欢迎使用' }}</h1>
    <p>直接的中文文本</p>
  </div>
</template>

<script>
export default {
  name: 'Test'
}
</script>
`;

const translations = {
  '哈哈': { 'en': 'Haha' },
  '剩余车位：': { 'en': 'Remaining parking spaces:' },
  '请输入哈哈哈': { 'en': 'Please enter hahaha' },
  '欢迎使用': { 'en': 'Welcome to use' },
  '直接的中文文本': { 'en': 'Direct Chinese text' }
};

console.log('原始Vue文件:');
console.log(testVueFile);

console.log('\n转换后:');
const result = transformer.transform(testVueFile, translations);
console.log(result);
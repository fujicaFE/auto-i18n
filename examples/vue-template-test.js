// 测试Vue模板转换
const { Transformer } = require('../lib/utils/transformer');

const transformer = new Transformer({
  functionName: '$t'
});

// 测试模板
const testTemplate = `
<div class="home">
  <div title="哈哈">剩余车位：{{ '--' }}</div>
  <input placeholder="请输入哈哈哈"></input>
  <h1>{{ '欢迎使用' }}</h1>
  <p>直接的中文文本</p>
</div>
`;

const translations = {
  '哈哈': { 'en': 'Haha' },
  '剩余车位：': { 'en': 'Remaining parking spaces:' },
  '请输入哈哈哈': { 'en': 'Please enter hahaha' },
  '欢迎使用': { 'en': 'Welcome to use' },
  '直接的中文文本': { 'en': 'Direct Chinese text' }
};

console.log('原始模板:');
console.log(testTemplate);

console.log('\n转换后:');
const result = transformer.transform(testTemplate, translations);
console.log(result);
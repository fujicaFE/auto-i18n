// 测试用户配置的代码风格
const { Transformer } = require('../lib/utils/transformer');

// 测试1: 不添加分号，使用单引号（默认）
console.log('=== 测试默认配置 (无分号，单引号) ===');
const transformer1 = new Transformer();

const testCode = `
const message = '欢迎使用'
const title = '首页'
`;

const translations = {
  '欢迎使用': { 'en': 'Welcome' },
  '首页': { 'en': 'Home' }
};

console.log('原始代码:');
console.log(testCode);

const result1 = transformer1.transform(testCode, translations);
console.log('转换后 (默认配置):');
console.log(result1);

// 测试2: 添加分号，使用双引号
console.log('\n=== 测试自定义配置 (有分号，双引号) ===');
const transformer2 = new Transformer({
  functionName: '$t',
  semicolons: true,
  quotes: 'double'
});

const result2 = transformer2.transform(testCode, translations);
console.log('转换后 (自定义配置):');
console.log(result2);

// 测试3: 只配置分号，引号自动检测
console.log('\n=== 测试部分配置 (有分号，自动检测引号) ===');
const transformer3 = new Transformer({
  functionName: '$t',
  semicolons: true
  // quotes 不配置，应该自动检测为单引号
});

const result3 = transformer3.transform(testCode, translations);
console.log('转换后 (部分配置):');
console.log(result3);
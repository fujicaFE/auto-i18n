// 测试代码风格保持功能
const { Transformer } = require('../lib/utils/transformer');

const transformer = new Transformer({
  functionName: '$t'
});

// 测试不带分号的代码风格
console.log('=== 测试不带分号的代码风格 ===');
const codeWithoutSemicolons = `
const message = '欢迎使用'
const title = '首页'

export default {
  data() {
    return {
      msg: '测试消息',
      status: '完成'
    }
  }
}
`;

const translations = {
  '欢迎使用': { 'en': 'Welcome' },
  '首页': { 'en': 'Home' },
  '测试消息': { 'en': 'Test Message' },
  '完成': { 'en': 'Complete' }
};

console.log('原始代码 (无分号):');
console.log(codeWithoutSemicolons);

const transformedWithoutSemicolons = transformer.transform(codeWithoutSemicolons, translations);
console.log('\n转换后 (应该保持无分号):');
console.log(transformedWithoutSemicolons);

// 测试带分号的代码风格
console.log('\n\n=== 测试带分号的代码风格 ===');
const codeWithSemicolons = `
const message = '欢迎使用';
const title = '首页';

export default {
  data() {
    return {
      msg: '测试消息',
      status: '完成'
    };
  }
};
`;

console.log('原始代码 (有分号):');
console.log(codeWithSemicolons);

const transformedWithSemicolons = transformer.transform(codeWithSemicolons, translations);
console.log('\n转换后 (应该保持有分号):');
console.log(transformedWithSemicolons);

// 测试双引号风格
console.log('\n\n=== 测试双引号风格 ===');
const codeWithDoubleQuotes = `
const message = "欢迎使用";
const title = "首页";
`;

console.log('原始代码 (双引号):');
console.log(codeWithDoubleQuotes);

const transformedDoubleQuotes = transformer.transform(codeWithDoubleQuotes, translations);
console.log('\n转换后 (应该保持双引号):');
console.log(transformedDoubleQuotes);
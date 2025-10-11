import { ChineseExtractor } from '../src/utils/chinese-extractor';

describe('Vue Template Extraction', () => {
  let extractor: ChineseExtractor;

  beforeEach(() => {
    extractor = new ChineseExtractor();
  });

  test('should extract Chinese text from Vue template tags', () => {
    const vueTemplate = `
      <template>
        <div>
          <h1>欢迎使用自动国际化插件</h1>
          <p>这是一个测试文本</p>
          <span>包含中文的内容</span>
        </div>
      </template>
    `;
    
    const results = extractor.extractFromVueFile(vueTemplate);
    
    expect(results).toContain('欢迎使用自动国际化插件');
    expect(results).toContain('这是一个测试文本');
    expect(results).toContain('包含中文的内容');
  });

  test('should extract Chinese text from HTML attributes', () => {
    const vueTemplate = `
      <template>
        <div>
          <input placeholder="请输入用户名" title="用户名输入框" />
          <img alt="产品图片" />
        </div>
      </template>
    `;
    
    const results = extractor.extractFromVueFile(vueTemplate);
    
    expect(results).toContain('请输入用户名');
    expect(results).toContain('用户名输入框');
    expect(results).toContain('产品图片');
  });

  test('should extract Chinese text from Vue directives', () => {
    const vueTemplate = `
      <template>
        <div>
          <input v-bind:placeholder="'请输入密码'" />
          <div :title="'提示信息'">内容</div>
        </div>
      </template>
    `;
    
    const results = extractor.extractFromVueFile(vueTemplate);
    
    expect(results).toContain('请输入密码');
    expect(results).toContain('提示信息');
  });

  test('should extract Chinese strings from interpolation expressions', () => {
    const vueTemplate = `
      <template>
        <div>
          <p>{{ message || '默认消息' }}</p>
          <span>{{ isLoading ? '加载中...' : '完成' }}</span>
          <div>{{ '静态中文文本' }}</div>
        </div>
      </template>
    `;
    
    const results = extractor.extractFromVueFile(vueTemplate);
    
    expect(results).toContain('默认消息');
    expect(results).toContain('加载中...');
    expect(results).toContain('完成');
    expect(results).toContain('静态中文文本');
  });

  test('should not extract HTML tags or English text', () => {
    const vueTemplate = `
      <template>
        <div class="container">
          <h1>Welcome to our app</h1>
          <p>欢迎来到我们的应用</p>
          <button disabled>Button</button>
        </div>
      </template>
    `;
    
    const results = extractor.extractFromVueFile(vueTemplate);
    
    expect(results).toContain('欢迎来到我们的应用');
    expect(results).not.toContain('Welcome to our app');
    expect(results).not.toContain('Button');
    expect(results).not.toContain('container');
    expect(results).not.toContain('<h1>');
    expect(results).not.toContain('</h1>');
  });

  test('should extract from both template and script sections', () => {
    const vueFile = `
      <template>
        <div>{{ message }}</div>
      </template>
      
      <script>
      export default {
        data() {
          return {
            message: '来自脚本的消息',
            title: '页面标题'
          }
        },
        methods: {
          showAlert() {
            alert('这是一个警告');
          }
        }
      }
      </script>
    `;
    
    const results = extractor.extractFromVueFile(vueFile);
    
    expect(results).toContain('来自脚本的消息');
    expect(results).toContain('页面标题');
    expect(results).toContain('这是一个警告');
  });

  test('should handle mixed content correctly', () => {
    const vueTemplate = `
      <template>
        <div>
          <h1>产品详情</h1>
          <p>Price: $99.99</p>
          <p>名称: {{ productName }}</p>
          <button @click="buy">立即购买</button>
        </div>
      </template>
    `;
    
    const results = extractor.extractFromVueFile(vueTemplate);
    
    expect(results).toContain('产品详情');
    expect(results).toContain('名称:');
    expect(results).toContain('立即购买');
    expect(results).not.toContain('Price: $99.99');
    expect(results).not.toContain('$99.99');
  });
});